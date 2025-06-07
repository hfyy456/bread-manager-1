const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const connectDB = require('../express/config/db');
const FillingRecipe = require('../express/models/FillingRecipe');

const dataPath = path.join(__dirname, '..', 'src', 'data', 'fillingRecipes.json');

async function importData() {
  try {
    await connectDB();
    console.log('MongoDB Connected for import...');

    const fileContent = fs.readFileSync(dataPath, 'utf8');
    const dataArray = JSON.parse(fileContent);

    if (!dataArray || !Array.isArray(dataArray)) {
      console.error('Could not parse data from file.');
      await mongoose.disconnect();
      return;
    }

    console.log(`Found ${dataArray.length} items to process.`);

    const operations = dataArray.map(item => {
      if (!item || typeof item.name === 'undefined') {
          console.warn('Skipping invalid entry:', item);
          return null;
      }

      return {
        updateOne: {
          filter: { name: item.name },
          update: { $set: item },
          upsert: true,
        },
      };
    }).filter(op => op !== null);

    if (operations.length > 0) {
      const result = await FillingRecipe.bulkWrite(operations);
      console.log('Bulk write operation result:', result);
    } else {
      console.log('No valid items to import.');
    }

  } catch (error) {
    console.error('Error during import:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB Disconnected.');
  }
}

importData(); 