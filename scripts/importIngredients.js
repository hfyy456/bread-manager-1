const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Adjust the path to your DB connection and Model
const connectDB = require('../express/config/db');
const Ingredient = require('../express/models/Ingredient');

// Path to the ingredients data file
const ingredientsDataPath = path.join(__dirname, '..', 'src', 'data', 'ingredients.js');

async function importIngredients() {
  try {
    await connectDB();
    console.log('MongoDB Connected for import...');

    // Read the ingredients data file
    const fileContent = fs.readFileSync(ingredientsDataPath, 'utf8');
    
    // Extract the array string
    let arrayString = fileContent.substring(fileContent.indexOf('['));
    
    // Trim whitespace first to correctly detect trailing characters
    arrayString = arrayString.trim(); 

    // Remove potential trailing semicolon from the array string
    // (If the array was exported as `export const arr = [...];`)
    if (arrayString.endsWith(';')) {
      arrayString = arrayString.slice(0, -1);
      // After removing semicolon, trim again in case the original was like `] ;` which became `]`
      // This ensures a clean `[...]` for eval if there was space before the semicolon
      arrayString = arrayString.trim(); 
    }
    
    // A common pattern for JS array export is [item1, item2,]; a trailing comma.
    // This handles arrays like `[1,2,3,]` becoming `[1,2,3]`
    // If the string was `[1,2,];` and semicolon was removed, this makes it `[1,2]`
    if (arrayString.endsWith(',')) {
        arrayString = arrayString.slice(0, -1); 
    }

    // Evaluate the array string in a sandbox
    // Using eval like this: eval('(' + arrayString + ')') is a common way to parse JSON-like array/object literals.
    const sandbox = { rawArrayString: arrayString }; 
    vm.runInNewContext('parsedData = eval("(" + rawArrayString + ")")', vm.createContext(sandbox));
    const ingredientsArray = sandbox.parsedData;

    if (!ingredientsArray || !Array.isArray(ingredientsArray)) {
      console.error('Could not parse ingredients data from file. Parsed data:', ingredientsArray);
      await mongoose.disconnect();
      return;
    }

    console.log(`Found ${ingredientsArray.length} ingredients to process.`);

    const operations = ingredientsArray.map(ing => {
      if (!ing || typeof ing.name === 'undefined') { // Basic check for valid ingredient entry
          console.warn('Skipping invalid ingredient entry:', ing);
          return null;
      }

      let createTime = ing.create_time;
      if (typeof ing.create_time === 'object' && ing.create_time !== null && ing.create_time.$date) {
        createTime = ing.create_time.$date;
      }

      const ingredientData = {
        name: ing.name,
        unit: ing.unit,
        price: parseFloat(ing.price), // Ensure price is a number
        specs: ing.specs,
        thumb: ing.thumb,
        originalCreateTime: createTime, // Use the processed createTime
        post: Array.isArray(ing.post) ? ing.post.map(p => Number(p)).filter(n => !isNaN(n)) : [], // Ensure post is an array of numbers
        min: ing.min, // Map min to baseUnit
        norms: parseFloat(ing.norms), // Ensure norms is a number
        storeIds: Array.isArray(ing.store) ? ing.store : [], // Map store to storeIds and ensure it's an array
      };
      
      // Remove undefined or NaN fields to avoid issues with Mongoose validation for non-required fields
      Object.keys(ingredientData).forEach(key => {
        if (ingredientData[key] === undefined || (typeof ingredientData[key] === 'number' && isNaN(ingredientData[key]))) {
          delete ingredientData[key];
        }
      });

      // Use updateOne with upsert to insert if new, or update if name exists
      return {
        updateOne: {
          filter: { name: ingredientData.name },
          update: { $set: ingredientData },
          upsert: true,
        },
      };
    }).filter(op => op !== null); // Filter out any null operations from skipped entries

    if (operations.length > 0) {
      const result = await Ingredient.bulkWrite(operations);
      console.log('Bulk write operation result:', result);
      console.log(`Successfully processed ${result.upsertedCount || 0} new ingredients and ${result.modifiedCount || 0} updated ingredients.`);
    } else {
      console.log('No valid ingredients to import.');
    }

  } catch (error) {
    console.error('Error during ingredient import:', error);
    if (error.writeErrors) {
        error.writeErrors.forEach(writeError => {
            console.error('Failed operation:', writeError.err.op);
            console.error('Error message:', writeError.err.errmsg);
        });
    }
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB Disconnected.');
  }
}

importIngredients(); 