/* Constant data for storage for file uploading : category excel files */

const fileUploadConstants = {
    'storagePath': './storage/category-excel',  // Path to store Excel files
    'fileSize': 2 * 1024 * 1024,  // File size limit (2 MB)
    'allowedMimes': [
        'application/vnd.ms-excel',  // MIME type for .xls
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'  // MIME type for .xlsx
    ]
};

module.exports = {
    fileUploadConstants
};
