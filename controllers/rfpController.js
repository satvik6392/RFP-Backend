const models = require('../config/initModels');
const { upload } = require('../config/multer');
const dotenv = require('dotenv'); // Import the token model
const XLSX = require('xlsx');
const fs = require('fs');  // To handle file operations
const { where, Op} = require('sequelize');
const multer = require('multer'); 
const { type } = require('os');

exports.createRfp = async (req, res) => {
    const {
      item_name, rfp_no, quantity, last_date, minimum_price,
      maximum_price, categories, vendors, item_description,
      item_price, total_cost, company_id
    } = req.body;
  
    const user_id = req.user_id;
    if(req.company_id != company_id)
    {
        console.log(req.company_id);
        console.log(company_id);
        return res.status(403).json({response: 'error',error:'Access denied!'});
    }
    const time = new Date();
  
    // Input validation
    let errors = [];
    if (!item_name) errors.push("Item name is required");
    if (!rfp_no) errors.push("RFP number is required");
    if (!quantity) errors.push("Quantity is required");
    if (!last_date) errors.push("Last date is required");
    if (!minimum_price) errors.push("Minimum price is required");
    if (!maximum_price) errors.push("Maximum price is required");
    if (!categories) errors.push("Category is required");
    if (!vendors) errors.push("Vendors are required");
    if (!item_description) errors.push("Item description is required");
    if (!company_id) errors.push("Company id is required");
  
    if (errors.length > 0) {
      return res.status(400).json({ response: "error", error: errors });
    }
  
    try {
      // Convert categories and vendors to arrays
      const categoriesArray = categories.split(',');
      const vendorsArray = vendors.split(',');
  
      // Validate categories using Category model
      const validCategories = await models.categories.findAll({
        where: { id: { [Op.in]: categoriesArray }, company_id: company_id, status: 'Active'}
      });
  
      if (validCategories.length !== categoriesArray.length) {
        return res.status(400).json({ response: "error", error: "Invalid category IDs" });
      }
  
      // Validate vendors using User model
      const validVendors = await models.users.findAll({
        where: {
          user_id: { [Op.in]: vendorsArray },
          status: 'Approved',
          company_id: company_id,
          type: 'vendor'
        }
      });
  
      if (validVendors.length !== vendorsArray.length) {
        return res.status(400).json({ response: "error", error: "Some vendors are invalid or not approved" });
      }
  
      // Create RFP in the database
      const newRfp = await models.rfps.create({
        item_name,
        rfp_no,
        quantity,
        last_date,
        created_at: time,
        updated_at: time,
        min_price: minimum_price,
        max_price: maximum_price,
        category_id: categories, // Assuming this is a single category ID, adjust as necessary
        item_description,
        item_price,
        total_cost,
        status: 'open',
        user_id,
        company_id // Include company ID
      });
  
      // Insert RFP to vendor mapping
      const rfp_id = newRfp.id;
      const vendorMappings = vendorsArray.map(vendor_id => ({
        rfp_id,
        user_id: vendor_id
      }));
  
      await models.rfp_to_vendor_mapping.bulkCreate(vendorMappings);
  
      return res.status(200).json({ response: "success", rfp_id });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ response: "error", error: error.message });
    }
  };


// Controller to fetch all RFPs
exports.getAllRfps = async (req, res) => {
    // return res.status(200).send("OK");
    try {
        const companyId = req.params.companyID; // Assuming company_id is passed as a query parameter

        if (!companyId) {
            return res.status(400).json({ "response": "error", "error": "Company ID is required" });
        }
        if(companyId != req.company_id)
        {
            return res.status(403).json({"response":"error","error":"Access denied!"});
        }
        // Query to fetch all RFPs with vendor mapping
        const rfps = await models.rfps.findAll({
            where: { company_id: companyId }, // Filter by company_id
            include: [
                {
                    model: models.rfp_to_vendor_mapping,
                    include: {
                        model: models.users,
                        attributes: ['user_id', 'name', 'status'] // Example attributes
                    }
                }
            ],
            attributes: [
                'id','user_id', 'item_name', 'item_description', 'category_id', 'rfp_no',
                'quantity', 'min_price', 'max_price', 'last_date', 'createdAt', 'updatedAt',
                'total_cost', 'item_price', 'status'
            ]
        });

        if (!rfps || rfps.length === 0) {
            return res.status(200).json({ "response": "success", "message": "No RFP available" });
        }
        console.log(rfps);
        

        // Format the response if necessary
        const formattedRfps = rfps.map(rfp => ({
            rfp_id: rfp.id,
            user_id: rfp.user_id,
            item_name: rfp.item_name,
            item_description: rfp.item_description,
            category_id: rfp.category_id,
            rfp_no: rfp.rfp_no,
            quantity: rfp.quantity,
            minimum_price: rfp.min_price,
            maximum_price: rfp.max_price,
            last_date: rfp.last_date, // Format the last_date
            created_at: rfp.createdAt,
            updated_at: rfp.updatedAt,
            total_cost: rfp.total_cost,
            item_price: rfp.item_price,
            status: rfp.status,
            vendors: rfp.rfp_to_vendor_mappings.map(mapping => ({
                vendor_id: mapping.user_id,
                // vendor_name: mapping.vendor.name,
                // vendor_status: mapping.vendor.status
            }))
        }));

        return res.status(200).json({ "response": "success", "rfps": formattedRfps });

    } catch (error) {
        console.error('Error fetching RFPs:', error);
        return res.status(500).json({ "response": "error", "error": "An error occurred while fetching RFPs" });
    }
};


// Controller to get RFPs based on vendor ID
exports.getRFPByUserId = async (req, res) => {

    const vendorId = req.params.userId;
    const companyID = req.params.companyID;
    console.log(vendorId);
    console.log(companyID);
    
    if(companyID != req.company_id )
    {
        return res.status(403).json({"response":"error","error":"Access denied!"});
    }
    

    try {

        const validVendor = await models.users.findOne({
            where:{user_id: vendorId, company_id : companyID}
        });
        if(!validVendor)
        {
            return res.status(400).json({'resposne':"error","error":"Invalid vendor id"});
        }
        const rfps = await models.rfps.findAll({
            include: [
                {
                    model: models.rfp_to_vendor_mapping,
                    where: { user_id: vendorId },
                    attributes: ['user_id'],
                }
            ],
            attributes: [
                'id',
                'user_id',
                'item_name',
                'item_description',
                'category_id',
                'rfp_no',
                'quantity',
                'min_price',
                'max_price',
                'last_date',
                'createdAt',
                'updatedAt',
                'total_cost',
                'item_price',
                'status'
            ]
        });

        if (rfps.length === 0) {
            return res.status(200).json({ response: "error", error: "No RFP available" });
        }

        const formattedRfps = rfps.map(rfp => ({
            rfp_id: rfp.id,
            uesr_id: rfp.user_id,
            item_name: rfp.item_name,
            item_description: rfp.item_description,
            category_id: rfp.category_id,
            rfp_no: rfp.rfp_no,
            quantity: rfp.quantity,
            minimum_price: rfp.min_price,
            maximum_price: rfp.max_price,
            last_date: rfp.last_date,
            created_at: rfp.createdAt,
            updated_at: rfp.updatedAt,
            total_cost: rfp.total_cost,
            item_price: rfp.item_price,
            status: rfp.status,
        }));

        return res.status(200).json({ response: "success", rfps: formattedRfps });

    } catch (error) {
        return res.status(400).json({ response: "error", error: error.message });
    }
};


exports.applyQuotes = async (req, res) => {
   
    const { item_price, total_cost, rfp_id } = req.body;
    const user_id = req.user_id;
    const company_id = req.company_id;
     if(company_id != req.params.companyID)
     {
        return res.status(403).json({"response":"error","error":"Access denied!"});
     }

    // Validate input
    let errors = [];
    if (!item_price) errors.push("Item price is required");
    if (!total_cost) errors.push("Total cost is required");
    if (!rfp_id) errors.push("RFP id is required");

    if (errors.length > 0) {
        return res.status(400).json({ response: "error", error: errors });
    }


    // const vendorApproved = await models.rfp_to_vendor_mapping.findAll({
    //     where: {user_id: req.user_id, rfp_id: rfp_id}
    // })
    // if(!vendorApproved)
    // {
    //     return res.status(400).json({"response":"error","error":"Invalid request!"});
    // }
    
    try {
        // Check if the RFP exists
        const rfp = await models.rfps.findOne({ where: { id: rfp_id } });
        if (!rfp) {
            return res.status(404).json({ response: "error", error: "RFP not found" });
        }

        // Check if the user is invited to apply for this RFP
        const invitation = await models.rfp_to_vendor_mapping.findOne({
            where: { rfp_id, user_id }
        });
        if (!invitation) {
            return res.status(403).json({ response: "error", error: "You are not invited to apply for this RFP" });
        }

        // Check if the user has already applied to this RFP
        const existingApplication = await models.quotes.findOne({
            where: { rfp_id, vendor_id: user_id }
        });
        if (existingApplication) {
            return res.status(200).json({ response: "error", error: "You have already applied to this RFP" });
        }

        // Insert the application into the database
        const date = new Date();
        await models.quotes.create({
            rfp_id,
            vendor_id: user_id,
            item_price,
            total_cost,
            created_at: date
        });

        // Update the RFP status to "applied"
        await models.rfps.update({ status: "applied" }, { where: { id: rfp_id } });

        return res.status(200).json({ response: "success", message: "RFP application submitted successfully" });
        
    } catch (error) {
        return res.status(400).json({ response: "error", error: error.message });
    }
};


exports.getQuotes =  async (req, res) => {
    const rfp_id = req.body.rfp_id;
    const company_id = req.params.companyID;
    if(!company_id)
    {
        return res.status(400).json({'response':"error",'error':"Company id is required."})
    }
    if(!rfp_id)
    {
        return res.status(400).json({'response':"error",'error':"RFP id is required."})
    }
    if(req.company_id != req.params.companyID)
    {
        return res.status(400).json({"response":"error","error":"Unauthorized user."});
    }
    try {
        const quotes = await models.quotes.findAll({
            where: { rfp_id },
            include: [
                {
                    model: models.users,
                    attributes: ['user_id', 'name', 'email'],
                    where: {company_id},
                    include: [
                        {
                            model: models.vendors,
                            attributes: ['mobile']
                        }
                    ]
                    
                }
            ]
        });

        if (quotes.length === 0) {
            return res.status(400).json({ response: "error", error: "No quotes found for this RFP" });
        }

        console.log(quotes);
        
        const formattedQuotes = quotes.map(quote => ({
            vendor_id: quote.user.user_id,
            name: quote.user.name,
            item_price: quote.item_price,
            total_cost: quote.total_cost,
            email: quote.user.email,
            mobile: quote.user.vendor.mobile
        }));

        return res.status(200).json({ response: "success", quotes: formattedQuotes });
    } catch (error) {
        return res.status(400).json({ response: "error", error: error.message });
    }
};
