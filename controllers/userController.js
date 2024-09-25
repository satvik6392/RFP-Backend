const models = require('../config/initModels');
const { upload } = require('../config/multer');
const dotenv = require('dotenv'); // Import the token model
const XLSX = require('xlsx');
const fs = require('fs');  // To handle file operations
const { where } = require('sequelize');
const multer = require('multer'); 

dotenv.config();  // Load environment variables from .env file


exports.addUser = async (req, res) => {
   
    const { name, email, password, role } = req.body;
    console.log(name);

    
    // return res.status(200).send("OK");
    const company_id = req.company_id;
    const type = role;
    const status = 'Approved'

    console.log(req.body);
    
    try {
        // Validate input
        if (!name || !email || !password || !type) {
            return res.status(400).json({ 'response': "error", 'error': "All fields are required." });
        }

        // Check if the user already exists
        const existingUser = await models.users.findOne({ where: { email, company_id } });
        if (existingUser) {
            return res.status(400).json({ "response": "error", "error": "User with this email already exists." });
        }

        // Create the new user
        const newUser = await models.users.create({
            name,
            email,
            password, // Consider hashing the password before saving
            type,
            company_id,
            status
        });

        return res.status(201).json({ 'response': "success", 'message': "User added successfully."});
    } catch (error) {
        console.error("Error adding user:", error);
        return res.status(500).json({ 'response': "error", 'error': "An error occurred while adding the user." });
    }
};


exports.getCompanyList = async (req, res) => {
    try {
      // Fetch company list from the database
      const companies = await models.company.findAll({
        attributes: ['id', 'name'], // Select only id and name fields
      });
  
      // Return the list of companies
      return res.status(200).json({
        response: 'success',
        data: companies,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        response: 'error',
        "error": 'Failed to retrieve company list',
      });
    }
  };
