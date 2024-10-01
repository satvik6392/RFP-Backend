const bcrypt = require('bcryptjs');
const models = require('../config/initModels');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv'); // Import the token model
const company = require('../models/company');
const { where } = require('sequelize');
const { createLog } = require('./logs');
const svgCaptcha = require('svg-captcha');
const speakeasy = require('speakeasy');
const { route } = require('../routes');
const QRCode = require('qrcode');
// const { response } = require('../app');

dotenv.config();  // Load environment variables from .env file



exports.login = async (req, res) => {
    try {
        // const secret = speakeasy.generateSecret({ length: 20 });
        // const verified = speakeasy.totp.verify({
        //     secret: 'KFAEYPTDLZYTMNL5GYZXOSCJKR4D6OJE',
        //     encoding: 'base32',
        //     token: req.body.otp,
        // });
        // console.log(`verified : ${verified}`);

        const req_url = req.originalUrl; // Capture the request URL
        const ip_address = req.ip;
        // Find the user by email
        var companyName;
        const existingCompany = await models.company.findOne({ where: { id: req.body.company_id } });
        if (!existingCompany) {

            // inserting logs in log table
            await createLog({
                user_id: null,
                req_url,
                action: "Login", // Describe the action
                details: "Invalid company ID provided during login",
                ip_address,
                category: "error"
            });

            return res.status(400).json({ "response": "error", "error": "Invalid company!" });
        }
        companyName = existingCompany.name;
        console.log(companyName);
        
        const fetchUserFromDB = await models.users.findOne({ where: { email: req.body.email, company_id: req.body.company_id } });

       
        
        if (!fetchUserFromDB) {
            // inserting logs in log table
            await createLog({
                user_id: null,
                req_url,
                action: "Login", // Describe the action
                details: "Login with wrong credentials",
                ip_address,
                category: "error"
            });
            return res.status(400).json({ response: 'error', error: 'User not found!' });
        }
        if (fetchUserFromDB.status != 'Approved') {
            // inserting logs in log table
            await createLog({
                user_id: null,
                req_url,
                action: "Login", // Describe the action
                details: `Attemped loging with, account status: ${fetchUserFromDB.status}`,
                ip_address,
                category: "error"
            });
            return res.status(400).json({ 'response': 'error', 'error': "Account is not approved!" });
        }


        console.log(req.body.password);
        
        const isMatch = await bcrypt.compare(req.body.password, fetchUserFromDB.password);
        console.log(isMatch);

        if (fetchUserFromDB && isMatch) {
            // Generate the token using the secret from the .env file
            const token = jwt.sign(
                {
                    email: fetchUserFromDB.email,
                    user_id: fetchUserFromDB.user_id,
                    company_id: fetchUserFromDB.company_id,
                    time: new Date().toISOString(),
                },
                process.env.MY_SECRET_KEY,  // Use the secret key from .env
                { expiresIn: '48h' }  // Set token expiration (24 hours)
            );

            // Calculate the token expiry date
            const expiryDate = new Date();
            expiryDate.setHours(expiryDate.getHours() + 24);  // Token expires in 24 hours

            // Save the token in the tokens table
            await models.tokens.create({
                user_id: fetchUserFromDB.user_id,  // Assuming user_id is in the user model
                token: token,
                expires_in: expiryDate
            });

            // inserting logs in log table
            await createLog({
                user_id: fetchUserFromDB.user_id,
                req_url,
                action: "Login", // Describe the action
                details: `Login successfully`,
                ip_address,
                category: "success"
            });
            // Send the response back without the password
            return res.status(200).json({
                response: 'success',
                user_id: fetchUserFromDB.user_id,
                type: fetchUserFromDB.type,
                name: fetchUserFromDB.name,
                email: fetchUserFromDB.email,
                company_id: parseInt(req.body.company_id),
                token: token,  // Include the token in the response,
                company_name: companyName,
                is_2fa_enabled: fetchUserFromDB.isTwoFactorEnabled
            });

        } else {
            // inserting logs in log table
            await createLog({
                user_id: null,
                req_url,
                action: "Login", // Describe the action
                details: `Invalid credentials`,
                ip_address,
                category: "success"
            });
            // If the email or password is incorrect, send a 401 Unauthorized response
            return res.status(401).json({ response: 'error', error: 'Invalid email or password' });
        }
    } catch (error) {
        console.error(error);

        return res.status(500).json({ response: 'error', error: 'Internal server error' });
    }
};

// Admin/Company Registration
// On registering with company if company exist already it will show error
// Else it will create a company and register you as an admin for that particular company
exports.adminRegistration = async (req, res) => {
    try {
        const req_url = req.originalUrl; // Capture the request URL
        const ip_address = req.ip;
        const { first_name, last_name, email, password, company_name } = req.body;
        const errorMessages = []; // Array to hold error messages

        // Check each field and add an error message if it is missing
        if (!first_name) {
            errorMessages.push('First name is required');
        }
        if (!last_name) {
            errorMessages.push('Last name is required');
        }
        if (!email) {
            errorMessages.push('Email is required');
        }
        if (!password) {
            errorMessages.push('Password is required');
        }
        if (!company_name) {
            errorMessages.push('Company name is required');
        }

        // If there are any error messages, return them
        if (errorMessages.length > 0) {
            // inserting logs in log table
            await createLog({
                user_id: null,
                req_url,
                action: "Admin registration", // Describe the action
                details: `${errorMessages}`,
                ip_address,
                category: "error"
            });
            return res.status(400).json({ response: 'error', 'error': errorMessages });
        }

        // Check if the company already exists
        const existingCompany = await models.company.findOne({ where: { name: company_name } });
        if (existingCompany) {
            // inserting logs in log table
            await createLog({
                user_id: null,
                req_url,
                action: "Admin registration", // Describe the action
                details: `Company already exists`,
                ip_address,
                category: "error"
            });
            return res.status(400).json({ response: 'error', 'error': 'Company already exists' });
        }

        // Check if the email already exists in the users table
        // const existingUser = await models.users.findOne({ where: { email: email } });
        // if (existingUser) {
        //     await createLog({
        //         user_id:null,
        //         req_url,
        //         action: "Admin registration", // Describe the action
        //         details: `Company already exists`,
        //         ip_address,
        //         category: "error"
        //     });
        //     return res.status(400).json({ response: 'error', 'error': 'Email already in use' });
        // }

        // Create a new company entry
        const newCompany = await models.company.create({
            name: company_name,
            // Add any additional fields required for the company table
        });
        await createLog({
            user_id: null,
            req_url,
            action: "Admin registration", // Describe the action
            details: `Company created with id : ${newCompany.id}`,
            ip_address,
            category: "success"
        });
        console.log(newCompany);


        // Create a new user with the type 'admin'
        const newUser = await models.users.create({
            name: `${first_name} ${last_name}`,
            email: email,
            password: password,  // Store the hashed password
            company_id: newCompany.id,  // Link to the newly created company
            type: 'admin',  // Mark the user as an admin
            status: 'Approved',  // Set the status for the admin
            // Add any additional fields required for the user table
        });
        await createLog({
            user_id: newUser.id,
            req_url,
            action: "Admin registration", // Describe the action
            details: `Admin registered successfully with id : ${newUser.id}`,
            ip_address,
            category: "success"
        });

        // Return success response
        return res.status(201).json({
            response: 'success',
            message: 'Admin registered successfully',
            user: {
                user_id: newUser.user_id,
                first_name: newUser.first_name,
                last_name: newUser.last_name,
                email: newUser.email,
                type: newUser.type,
                company_name: newCompany.name,
                company_id: newCompany.id
            }
        });
    } catch (error) {
        console.error(error);
        await createLog({
            user_id: null,
            req_url,
            action: "Admin registration", // Describe the action
            details: `Internal server error : ${error.message}`,
            ip_address,
            category: "error"
        });
        return res.status(500).json({ response: 'error', 'error': 'Internal server error' });
    }
};


exports.vendorRegistration = async (req, res) => {
    const req_url = req.originalUrl; // Capture the request URL
    const ip_address = req.ip;

    try {

        const { firstname, lastname, email, password, revenue, no_of_employees, pancard_no, gst_no, mobile, category, company_id } = req.body;
        let errors = [];

        if (!firstname) errors.push("Firstname is required");
        if (!lastname) errors.push("Last name is required");

        if (!email) errors.push("Email is required");
        if (email && !/^\S+@\S+\.\S+$/.test(email)) errors.push("Email is invalid");
        if (!password) errors.push("Password is required");
        if (!revenue) errors.push("Revenue is required");
        if (!no_of_employees) errors.push("No. of employee is required");
        if (!category) errors.push("Category is required");
        if (!company_id) errors.push("Company is required");
        if (!pancard_no) {
            if (!pancard_no) {
                errors.push("Pan card is required");
            } else if (!/[A-Z]{5}[0-9]{4}[A-Z]{1}/.test(pancard_no)) {
                errors.push("Enter a valid PAN card number");
            }
        }
        if (!gst_no) {
            errors.push("GST number is required");
        } else if (!/\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}/.test(gst_no)) {
            errors.push("Enter a valid GST number");
        }
        if (!mobile) errors.push("Mobile is required");
        if (mobile && !/^\d{10}$/.test(mobile)) errors.push("Enter a valid mobile no.");
        // console.log(mobile);


        const mailExistForCompany = await models.users.findOne({ where: { email: email, company_id: company_id } });
        if (mailExistForCompany) {
            errors.push("This mail is already in use.");
        }

        const categoryIds = category.split(',').map(id => id.trim());  // Split and trim each category ID
        for (const categoryId of categoryIds) {
            const categoryExists = await models.categories.findOne({
                where: {
                    id: categoryId,
                    company_id: company_id,  // Check if the category belongs to the specified company
                },
            });
            if (category && !categoryExists) {
                errors.push("Invalid categories!");
                break;
            }
        }


        const existingCompany = await models.company.findOne({ where: { id: company_id } });
        if (!existingCompany) {
            errors.push("Invalid company!");
            await createLog({
                user_id: null,
                req_url,
                action: "Vendor registration", // Describe the action
                details: `${errors}`,
                ip_address,
                category: "error"
            });
            return res.status(400).json({ "response": "error", "error": errors });
        }
        if (errors.length > 0) {
            await createLog({
                user_id: null,
                req_url,
                action: "Vendor registration", // Describe the action
                details: `${errors}`,
                ip_address,
                category: "error"
            });
            return res.status(400).json({ "response": "error", "error": errors });
        }
        /// create vendor in users table
        const newUser = await models.users.create({
            name: `${firstname} ${lastname}`,
            email: email,
            password: password,  // Store the hashed password
            company_id: company_id,  // Link to the newly created company
            type: 'vendor',  // Mark the user as an admin
            status: 'Pending',  // Set the status for the admin
            // Add any additional fields required for the user table
        });
        console.log(newUser);


        const newVendor = await models.vendors.create({
            user_id: newUser.user_id,  // Use the newly created user's ID
            pan_no: pancard_no,
            gst_no: gst_no,
            mobile: mobile,
            employee_count: no_of_employees,
            revenue: revenue,
        });


        // Loop through each category ID and create an entry in the `categories` table
        for (const categoryId of categoryIds) {
            await models.vendors_to_category_mapping.create({
                user_id: newUser.user_id,  // Link the category to the user
                category_id: categoryId,  // Use the user's company_id if needed
            });
        }

        // insert log in log table
        await createLog({
            user_id: newUser.user_id,
            req_url,
            action: "Vendor registration", // Describe the action
            details: `Vendor registered successfully with user id : ${newUser.user_id}`,
            ip_address,
            category: "success"
        });
        return res.status(200).json(
            {
                response: "success",
                message: "registered succesfully",
                status: "Pending",
                company_id: company_id
            });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ response: "error", error: "Internal server error!" });

    }


};


exports.logout = async (req, res) => {
    try {
        // Destroy the session
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).render('error', { message: 'Failed to logout' });
            }
            // Redirect to the login page or home page after logout
            res.redirect('/'); // Adjust the redirection as needed
        });
    } catch (error) {
        // Handle unexpected errors
        console.error(error);
        res.status(500).render('error', { message: 'An error occurred while logging out' });
    }
};

let captchaStore = {}; // Store generated captchas temporarily

// Generate CAPTCHA
exports.generateCaptcha = (req, res) => {
    console.log(req.session.id);

    try {
        // Generate captcha
        const captcha = svgCaptcha.create({
            size: 6, // Number of characters
            noise: 0, // Noise level
            color: true,
            width: 100,
            height: 40,
        });

        // Store the captcha text in session for verification later
        req.session.captcha = captcha.text;
        console.log(req.session.captcha);


        // Convert the SVG captcha to base64
        const captchaBase64 = Buffer.from(captcha.data).toString('base64');

        // Send success response with captcha
        return res.status(200).json({
            response: 'success',
            captcha: captchaBase64
        });

    } catch (error) {
        // Handle errors and send error response
        return res.status(500).json({
            response: 'error',
            error: error.message // Include error message for debugging
        });
    }
};

// Verify CAPTCHA
// Middleware for captcha verification
exports.verifyCaptcha = async (req, res, next) => {
    console.log(req.session.id);
    const userInput = req.body.captcha; // Get user input from the request body
    const storedCaptcha = req.session.captcha; // Retrieve stored captcha from session

    console.log(userInput);
    console.log(storedCaptcha);
    if (!userInput) {
        return res.status(400).json({ 'response': 'error', 'error': 'Invalid captcha' });
    }

    // Check if user input matches the stored captcha
    if (userInput === storedCaptcha) {
        next(); // Captcha is valid, proceed to the next middleware/controller
    } else {
        return res.status(400).json({ 'response': 'error', 'error': 'Invalid captcha' });
    }
};

exports.generateQR = async (req, res) => {
    try {
        const user_id = req.body.user_id; // Get user's ID from request body

        // Fetch the user from the database using Sequelize
        const user = await models.users.findOne({
            where: { user_id }
        });

        // Check if user exists
        if (!user) {
            return res.status(404).json({'response':'error', 'error': 'User not found' });
        }
        if (!user.two_factor_secret)
        {
            const secret = speakeasy.generateSecret({ length: 20 });
            console.log(secret);
            
            const secretBase32 = secret.base32;
            const qrCodeImageUrl = await QRCode.toDataURL(`otpauth://totp/RFP:${user.email}?secret=${secretBase32}`);
            await models.users.update(
                {
                    two_factor_secret: secretBase32, // Save the generated secret
                },
                { where: { user_id } }
            );
            return res.json({ 'response' :'success',qrCode: qrCodeImageUrl });
        }else{
            const qrCodeImageUrl = await QRCode.toDataURL(`otpauth://totp/RFP:${user.email}?secret=${user.two_factor_secret}&issuer=Velocity`);
            return res.json({'response' :'success',qrCode: qrCodeImageUrl})
        }

        // Generate a secret key using speakeasy
        
        

        // Update the user with the generated secret key and enable 2FA in the database
        // await models.users.update(
        //     {
        //         two_factor_secret: secretBase32, // Save the generated secret
        //         isTwoFactorEnabled: true, // Flag to indicate 2FA is enabled
        //     },
        //     { where: { user_id } }
        // );

        // Generate the OTP auth URL (used by Google Authenticator)
        

        // Generate the QR code as a Data URL
        
    } catch (error) {
        console.error(error);
        return res.status(500).json({ response: 'error', error });
    }
};


exports.verifyOTP = async (req, res) => {
    try {
        const { user_id, otp } = req.body; // Extract user_id and OTP token from request body

        // Fetch the user's details from the database
        const user = await models.users.findOne({
            where: { user_id }
        });

        // Check if user exists
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Fetch the user's secret key
        const secret = user.two_factor_secret; // The secret should be stored during 2FA setup
        console.log(otp);
        console.log(secret);
        
        
        // Verify the provided OTP token using the secret stored for the user
        const verified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: otp,
            window: 1 // Allow a 30-second window to account for clock drift
        });

        if (verified) {
            await models.users.update(
                { isTwoFactorEnabled: true }, // Update the 2FA status
                { where: { user_id } } // Condition to find the user by user_id
            );

            return res.status(200).json({ 'response':'success','message': 'OTP verified successfully, 2FA enabled.' });
        } else {
            return res.status(401).json({ 'response':'error','error': 'Invalid OTP' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 'response':'error','error': 'Internal server error.' });
    }
};
