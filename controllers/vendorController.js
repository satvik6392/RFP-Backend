const models = require('../config/initModels');
const { upload } = require('../config/multer');
const dotenv = require('dotenv'); // Import the token model
const XLSX = require('xlsx');
const fs = require('fs');  // To handle file operations
const { where } = require('sequelize');
const multer = require('multer'); 
const ExcelJS = require('exceljs');


/*To get the list of vendors of a company*/
exports.getVendorList = async (req, res) => {
    try {
        const { companyID, vendorId } = req.params;

        if (!companyID) {
            return res.status(400).json({
                response: "error",
                error: "Company ID is required"
            });
        }
        if(companyID != req.company_id)
            {
                return res.status(403).json({response:'error',error:"Unauthorized user!"});
            }

        let whereClause = {
            company_id: companyID,
            type: 'vendor',
        };

        if (vendorId) {
            whereClause.user_id = vendorId;
        }

        const vendorList = await models.users.findAll({
            where: whereClause,
            include: [
                {
                    model: models.vendors,
                    required: true,
                    attributes: ['mobile', 'employee_count']
                },
                {
                    model: models.vendors_to_category_mapping,
                    attributes: ['category_id'],
                    required: false,
                    include: [
                        {
                            model: models.categories,
                            required: true,
                            where: {
                                company_id: companyID  // Ensure category is from the specified company
                            }
                        }
                    ]
                }
            ],
            attributes: ['user_id', 'name', 'email', 'status'],
            order: [['user_id', 'ASC']],
            raw: true,
        });

        if (!vendorList || vendorList.length === 0) {
            return res.status(200).json({
                response: "success",
                vendors: []
            });
        }

        const vendorMap = vendorList.reduce((acc, vendorUser) => {
            if (!acc[vendorUser.user_id]) {
                acc[vendorUser.user_id] = {
                    user_id: vendorUser.user_id,
                    name: vendorUser.name,
                    email: vendorUser.email,
                    mobile: vendorUser['vendor.mobile'],
                    no_of_employees: vendorUser['vendor.employee_count'],
                    status: vendorUser.status,
                    categories: []
                };
            }

            if (vendorUser['vendors_to_category_mappings.category_id']) {
                acc[vendorUser.user_id].categories.push(vendorUser['vendors_to_category_mappings.category_id']);
            }

            return acc;
        }, {});

        const vendorArray = Object.values(vendorMap).map(vendor => ({
            ...vendor,
            categories: vendor.categories.length ? vendor.categories.join(',') : null
        }));

        return res.status(200).json({
            response: "success",
            vendors: vendorArray
        });

    } catch (error) {
        console.error("Error fetching vendors:", error);
        return res.status(500).json({
            response: "error",
            error: "An error occurred while fetching the vendor list"
        });
    }
};

/* To get the vendors of a particular category*/
exports.getVendorListByCategory = async (req, res) => {
    console.log("Inside the getVendorListByCategory controller.");
    
    try {
        const { companyID, categoryId } = req.params;
       

        if (!companyID || !categoryId) {
            return res.status(400).json({
                response: "error",
                error: "Company ID and Category ID are required"
            });
        }
        if(companyID != req.company_id)
            {
                return res.status(403).json({response:'error',error:"Unauthorized user!"});
            }
        // Fetch all vendors that belong to the specified company
        const vendorList = await models.users.findAll({
            where: {
                company_id: companyID,
                type: 'vendor'
            },
            include: [
                {
                    model: models.vendors,
                    required: true,
                    attributes: ['mobile', 'employee_count']
                },
                {
                    model: models.vendors_to_category_mapping,
                    attributes: ['category_id'],
                    required: true,
                    where: {
                        category_id: categoryId // This filters for the specified category
                    }
                }
            ],
            attributes: ['user_id', 'name', 'email', 'status'],
            order: [['user_id', 'ASC']],
            raw: true,
        });

        if (!vendorList || vendorList.length === 0) {
            return res.status(200).json({
                response: "success",
                vendors: []
            });
        }

        // Get all category IDs for the fetched vendors
        const allCategoryIds = await models.vendors_to_category_mapping.findAll({
            where: {
                user_id: vendorList.map(v => v.user_id) // Get all vendor IDs
            },
            attributes: ['user_id', 'category_id'],
            raw: true,
        });

        // Create a map to group categories by vendor
        const vendorMap = vendorList.reduce((acc, vendorUser) => {
            if (!acc[vendorUser.user_id]) {
                acc[vendorUser.user_id] = {
                    user_id: vendorUser.user_id,
                    name: vendorUser.name,
                    email: vendorUser.email,
                    mobile: vendorUser['vendor.mobile'],
                    no_of_employees: vendorUser['vendor.employee_count'],
                    status: vendorUser.status,
                    categories: [] // Initialize an array for categories
                };
            }

            // Add the specified category to the vendor's categories
            // acc[vendorUser.user_id].categories.push();
            return acc;
        }, {});

        // Now include all categories for each vendor
        allCategoryIds.forEach(({ user_id, category_id }) => {
            if (vendorMap[user_id]) {
                vendorMap[user_id].categories.push(category_id);
            }
        });

        // Prepare final array
        const vendorArray = Object.values(vendorMap).map(vendor => ({
            ...vendor,
            categories: [...new Set(vendor.categories)].join(',') // Remove duplicates and join
        }));

        return res.status(200).json({
            response: "success",
            vendors: vendorArray
        });

    } catch (error) {
        console.error("Error fetching vendors:", error);
        return res.status(500).json({
            response: "error",
            error: "An error occurred while fetching the vendor list"
        });
    }
};

/* To update the status of vendor from : Approve/Reject */
exports.updateStatus = async (req, res) => {
    const { vendor_id, status } = req.body;
    const company_id = req.company_id;
    console.log(status);
    
    // Validate input
    let errors = [];
    if (!vendor_id) errors.push("Vendor ID is required");
    if (!status) errors.push("Status is required");
    if (!company_id) errors.push("Company ID is required");

    const normalizedStatus = status.trim().charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    if (!['Pending', 'Approved', 'Rejected'].includes(normalizedStatus)) {
        errors.push("Invalid status value");
    }

    if (errors.length > 0) {
        return res.status(400).json({ "response": "error", "error": errors });
    }

    try {
        // Check if the vendor exists and belongs to the correct company
        const vendor = await models.users.findOne({
            where: { user_id: vendor_id,type: 'vendor' },
        });

        if (!vendor) {
            return res.status(404).json({ "response": "error", "error": "Vendor not found" });
        }else if(vendor.company_id != company_id)
        {
            return res.status(403).json({ "response": "error", "error": "Access denied." });
        }

        const currentStatus = vendor.status;

        // Handle status transitions based on current status
        if (currentStatus.toLowerCase() === 'pending') {
            if (normalizedStatus === 'Approved' || normalizedStatus === 'Rejected') {
                // Update status to Approved or Rejected
                await models.users.update({ status: normalizedStatus }, { where: { user_id: vendor_id } });
                res.status(200).json({ "response": "success", "message": `Vendor ${normalizedStatus.toLowerCase()} successfully` });
            } else {
                res.status(400).json({ "response": "error", "error": "Invalid status transition" });
            }
        } else if (currentStatus.toLowerCase() === 'approved') {
            if (normalizedStatus === 'Rejected') {
                return res.status(400).json({ "response": "error", "error": "Vendor already approved" });
            } else {
                res.status(400).json({ "response": "error", "error": "Invalid status transition" });
            }
        } else if (currentStatus.toLowerCase() === 'rejected') {
            if (normalizedStatus === 'Approved') {
                // Approve the rejected vendor
                await models.users.update({ status: normalizedStatus }, { where: { user_id: vendor_id } });
                res.status(200).json({ "response": "success", "message": "Vendor approved successfully" });
            } else {
                res.status(400).json({ "response": "error", "error": "Vendor already rejected" });
            }
        } else {
            res.status(400).json({ "response": "error", "error": "Unknown current status" });
        }

    } catch (error) {
        console.error("Error updating vendor status:", error);
        res.status(500).json({ "response": "error", "error": "Internal Server Error" });
    }
};

/* To download the vendor data in an excel sheet*/
exports.downloadVendorExcel =  async (req, res) => {
    const company_id = req.params.companyID;
    try {
        const vendorData = await models.vendors.findAll({
            include: [{
                model: models.users,
                where: {company_id},
                attributes: ['name', 'email', 'status', 'createdAt']
            }]
        });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Vendors');
        worksheet.columns = [
            { header: 'Vendor ID', key: 'id', width: 10 },
            { header: 'Name', key: 'name', width: 30 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Status', key: 'status', width: 30 },
            { header: 'Mobile', key: 'mobile', width: 30 },
            { header: 'Pan card', key: 'pan_no', width: 30 },
            { header: 'GST no.', key: 'gst_no', width: 30 },
            { header: 'No. of Employees', key: 'employee_count', width: 30 },
            { header: 'Registered at:', key: 'createdAt', width: 30 }
        ];

        vendorData.forEach(vendor => {
            console.log(vendor);
            // console.log(vendor.user.status);
            
            
            worksheet.addRow({
                id: vendor.user_id,
                name: vendor.user.name,
                email: vendor.user.email,
                status: vendor.user.status,
                mobile: vendor.mobile,
                pan_no: vendor.pan_no,
                gst_no: vendor.gst_no,
                employee_count: vendor.employee_count,
                createdAt: vendor.user.createdAt
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=vendors.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.log(error);
        
        return res.status(500).json({ error: 'An error occurred while generating the Excel file.' });
    }
};




