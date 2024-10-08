const models = require('../config/initModels');
const { upload } = require('../config/multer');
const dotenv = require('dotenv'); // Import the token model
const XLSX = require('xlsx');
const fs = require('fs');  // To handle file operations
const { where } = require('sequelize');
const multer = require('multer');
// const { response } = require('../app');
const { error } = require('console');
const { Op } = require('sequelize');

dotenv.config();  // Load environment variables from .env file


// get categories of a company
exports.getCategory = async (req, res) => {
    const { companyId, categoryId } = req.params;  // Get params from the URL


    try {
        // Validate that companyId is provided
        if (!companyId) {
            return res.status(400).json({ response: "error", error: "Company ID is required." });
        }

        // Query to fetch categories based on companyId, and categoryId if provided
        let queryOptions = {
            where: { company_id: companyId, status: {
                [Op.not]: "Deleted" // Exclude records where status is "Deleted"
            }}
        };

        // If categoryId is provided, add it to the query options
        if (categoryId) {
            queryOptions.where.id = categoryId;
        }

        // Fetch categories from the database
        const categories = await models.categories.findAll(queryOptions);

        // If no categories are found, return a 404 response
        if (categories.length === 0) {
            return res.status(404).json({ response: "error", message: "No categories found." });
        }

        // Format the response
        const formattedCategories = {};
        categories.forEach(category => {
            formattedCategories[category.id] = {
                id: category.id,
                name: category.name,
                status: category.status
            };
        });

        // Return the success response with categories
        return res.status(200).json({
            response: "success",
            categories: formattedCategories
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ response: "error", message: "Internal server error" });
    }
};

// Add a new category in 
exports.addCategory = async (req, res) => {
    // Handle file upload


    upload.single('category_excel')(req, res, async (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({ "response": "error", "error": err.message });
            }
            return res.status(400).json({ "response": "error", "error": err.message });
        }

        const { company_id, category_name } = req.body;
        const user_id = req.user_id;
        const categoryFile = req.file;

        // Step 1: Validate required fields
        if (!user_id || !company_id) {
            return res.status(400).json({ "response": "error", "error": "Fields missing!" });
        }

        // Step 2: Validate if the user is an admin
        const user = await models.users.findOne({ where: { user_id, company_id: company_id, } });
        if (!user) {
            return res.status(403).json({ "response": "error", "error": "User is not authorized for this company" });
        }

        let successCount = 0;
        let errorCount = 0;
        let errorMessages = [];

        // Step 3: Process category name if provided
        if (category_name) {
            // Check if the category name already exists for this company
            const categoryExists = await models.categories.findOne({
                where: {
                    name: category_name, company_id, status: {
                        [Op.not]: "Deleted" // Exclude records where status is "Deleted"
                    }
                }
            });

            if (!categoryExists) {
                await models.categories.create({
                    admin_id: user_id,
                    name: category_name,
                    status: 'Active',
                    company_id: company_id
                });
                successCount++;
            } else {
                errorCount++;
                errorMessages.push(`Category name "${category_name}" already exists for this company.`);
            }
        }

        // Step 4: Process the Excel file if provided
        if (categoryFile) {
            const filePath = categoryFile.path;

            let workbook;
            try {
                workbook = XLSX.readFile(filePath);
            } catch (error) {
                return res.status(400).json({ "response": "error", "error": "Invalid Excel file format" });
            }

            const sheetName = workbook.SheetNames[0];
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

            const expectedHeaders = ['id', 'name'];
            const actualHeaders = Object.keys(rows[0] || {});

            if (expectedHeaders.some(header => !actualHeaders.includes(header))) {
                return res.status(400).json({ "response": "error", "error": "Columns mismatched with expected format" });
            }

            for (const row of rows) {
                const { id, name } = row;

                if (!name) {
                    continue; // Skip if name is not present
                }

                if (id) {
                    // If ID is present, try to update the category
                    const category = await models.categories.findOne({
                        where: {
                            id, company_id, status: {
                                [Op.not]: "Deleted" // Exclude records where status is "Deleted"
                            }
                        }
                    });
                    if (category) {
                        // Check for name uniqueness before updating
                        const categoryExists = await models.categories.findOne({
                            where: {
                                name, company_id, status: {
                                    [Op.not]: "Deleted" // Exclude records where status is "Deleted"
                                }
                            }
                        });
                        if (categoryExists) {
                            errorCount++;
                            errorMessages.push(`Category name "${name}" already exists for this company.`);
                            continue; // Skip to the next row
                        }
                        category.name = name;
                        await category.save();
                        successCount++;
                    } else {
                        // ID does not exist; create a new category with a unique ID
                        const categoryExists = await models.categories.findOne({
                            where: {
                                name, company_id, status: {
                                    [Op.not]: "Deleted" // Exclude records where status is "Deleted"
                                }
                            }
                        });
                        if (!categoryExists) {
                            await models.categories.create({
                                admin_id: user_id,
                                name: name,
                                status: 'Active',
                                company_id: company_id
                            });
                            successCount++;
                        } else {
                            errorCount++;
                            errorMessages.push(`Category name "${name}" already exists for this company.`);
                        }
                    }
                } else {
                    // If ID is not present, create a new category
                    const categoryExists = await models.categories.findOne({
                        where: {
                            name, company_id, status: {
                                [Op.not]: "Deleted" // Exclude records where status is "Deleted"
                            }
                        }
                    });
                    if (!categoryExists) {
                        await models.categories.create({
                            admin_id: user_id,
                            name: name,
                            status: 'Active',
                            company_id: company_id
                        });
                        successCount++;
                    } else {
                        errorCount++;
                        errorMessages.push(`Category name "${name}" already exists for this company.`);
                    }
                }
            }

            // Clean up the uploaded file
            fs.unlinkSync(filePath);
        }

        // Step 5: Return consolidated response
        const responseMessage = {
            successCount,
            errorCount,
            errorMessages,
            message: `${successCount} categories added/updated successfully, ${errorCount} errors encountered.`
        };

        if (successCount > 0 || errorCount > 0) {
            return res.status(200).json(responseMessage);
        } else {
            return res.status(400).json({ "response": "error", "error": "No valid category data provided" });
        }
    });

    // upload.single('category_excel')(req, res, async (err) => {
    //     if (err) {
    //         if (err instanceof multer.MulterError) {
    //             return res.status(400).json({ "response": "error", "message": err.message });
    //         }
    //         return res.status(400).json({ "response": "error", "message": err.message });
    //     }

    //     const { company_id } = req.body;
    //     const user_id = req.user_id;
    //     const categoryFile = req.file;

    //     // Step 1: Validate required fields
    //     if (!user_id && !company_id) {
    //         return res.status(400).json({ "response": "error", "message": "user_id and company_id are required" });
    //     }

    //     let successCount = 0;
    //     let errorCount = 0;
    //     let errorMessages = [];

    //     // Step 3: Process the Excel file if provided
    //     if (categoryFile) {
    //         const filePath = categoryFile.path;

    //         let workbook;
    //         try {
    //             workbook = XLSX.readFile(filePath);
    //         } catch (error) {
    //             return res.status(400).json({ "response": "error", "message": "Invalid Excel file format" });
    //         }

    //         const sheetName = workbook.SheetNames[0];
    //         const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    //         const expectedHeaders = ['id', 'name'];
    //         const actualHeaders = Object.keys(rows[0] || {});

    //         if (expectedHeaders.some(header => !actualHeaders.includes(header))) {
    //             return res.status(400).json({ "response": "error", "message": "Columns mismatched with expected format" });
    //         }

    //         for (const row of rows) {
    //             const { id, name } = row;

    //             if (!name) {
    //                 continue; // Skip if name is not present
    //             }

    //             if (id) {
    //                 // If ID is present, try to update the category
    //                 const category = await models.categories.findOne({ where: { id, company_id } });
    //                 if (category) {
    //                     // Check for name uniqueness before updating
    //                     const categoryExists = await models.categories.findOne({ where: { name, company_id } });
    //                     if (categoryExists && categoryExists.id !== category.id) {
    //                         errorCount++;
    //                         errorMessages.push(`Category name "${name}" already exists for this company.`);
    //                         continue; // Skip to the next row
    //                     }
    //                     category.name = name;
    //                     await category.save();
    //                     successCount++;
    //                 } else {
    //                     // ID does not exist; create a new category with a unique ID
    //                     const categoryExists = await models.categories.findOne({ where: { name, company_id } });
    //                     if (!categoryExists) {
    //                         const newCategory = await models.categories.create({
    //                             admin_id: user_id,
    //                             name: name,
    //                             status: 'Active',
    //                             company_id: company_id
    //                         });
    //                         successCount++;
    //                     } else {
    //                         errorCount++;
    //                         errorMessages.push(`Category name "${name}" already exists for this company.`);
    //                     }
    //                 }
    //             } else {
    //                 // If ID is not present, create a new category
    //                 const categoryExists = await models.categories.findOne({ where: { name, company_id } });
    //                 if (!categoryExists) {
    //                     const newCategory = await models.categories.create({
    //                         admin_id: user_id,
    //                         name: name,
    //                         status: 'Active',
    //                         company_id: company_id
    //                     });
    //                     successCount++;
    //                 } else {
    //                     errorCount++;
    //                     errorMessages.push(`Category name "${name}" already exists for this company.`);
    //                 }
    //             }
    //         }

    //         // Clean up the uploaded file
    //         fs.unlinkSync(filePath);
    //     }

    //     // Step 4: Return consolidated response
    //     const responseMessage = {
    //         successCount,
    //         errorCount,
    //         errorMessages,
    //         message: `${successCount} categories added/updated successfully, ${errorCount} errors encountered.`
    //     };

    //     if (successCount > 0 || errorCount > 0) {
    //         return res.status(200).json(responseMessage);
    //     } else {
    //         return res.status(400).json({ "response": "error", "message": "No valid category data provided" });
    //     }
    // });


};

exports.deleteCategory = async (req, res) => {
    const company_id = req.company_id;
    const category_id = req.params.categoryId;

    if (!category_id) {
        return res.status(400).json({ 'response': 'error', 'error': "Category id requied!" });
    }
    try {
        var category = await models.categories.findOne({ where: { company_id: company_id, id: category_id, status: {
            [Op.not]: "Deleted" // Exclude records where status is "Deleted"
        }} });
        console.log(category);
        if (!category) {
            return res.status(400).json({ "response": "error", "error": "Cagtegory not found!" });
        } else {
            await models.categories.update(
                { deletedAt: new Date(), status: "Deleted" }, // Set the deleted_at field to the current date and time
                { where: { id: category_id } } // Specify the condition to match the category by its ID
            );
            return res.status(200).json({ 'response': "success", 'message': "Successfully deleted." });
        }

    } catch (err) {
        console.log(err);
        return res.status(400).json({ "response": "error", "error": "Internal server error." });
    }
}

exports.updateCategoryStatus = async (req, res) => {
    const company_id = req.company_id;
    const category_id = req.body.category_id; // Assuming category_id is coming from the request body
    const newStatus = req.body.new_status; // Assuming new_status is also coming from the request body

    if(newStatus != "Active" && newStatus != "Inactive")
    {
        return res.status(400).json({
            response:'error',
            'error':"Invalid status"
        })
    }
    if (!category_id || !newStatus) {
        return res.status(400).json({
            response: 'error',
            error: 'Category ID and new status are required.',
        });
    }

    try {
        // Find the category
        const category = await models.categories.findOne({
            where: { id: category_id, company_id: company_id },
        });

        // Check if the category exists
        if (!category) {
            return res.status(404).json({
                response: 'error',
                error: 'No category found!',
            });
        }

        // Check if the category status is 'deleted'
        if (category.status === 'Deleted') {
            return res.status(400).json({
                response: 'error',
                error: 'Category is deleted and cannot be updated.',
            });
        }

        // Check for status update conditions
        if (newStatus === 'Active' && category.status === 'Active') {
            return res.status(400).json({
                response: 'error',
                error: 'Category is already active.',
            });
        }

        if (newStatus === 'Inactive' && category.status === 'Inactive') {
            return res.status(400).json({
                response: 'error',
                error: 'Category is already inactive.',
            });
        }

        // Update the category status
        await models.categories.update(
            { status: newStatus },
            { where: { id: category_id } }
        );

        return res.status(200).json({
            response: 'success',
            message: `Category status updated to ${newStatus}.`,
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            response: 'error',
            error: 'An error occurred while updating the category status.',
        });
    }
};
