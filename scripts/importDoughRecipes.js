const fs = require('fs');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const DoughRecipe = require('../../express/models/DoughRecipe');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB Connected...');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

const importData = async () => {
    try {
        await connectDB();

        // First, delete all existing dough recipes
        await DoughRecipe.deleteMany();
        console.log('Existing dough recipes cleared.');

        const filePath = path.join(__dirname, '..', 'src', 'data', 'doughRecipes.json');
        const doughRecipes = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        await DoughRecipe.insertMany(doughRecipes);

        console.log('Dough Recipes Imported!');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

importData();