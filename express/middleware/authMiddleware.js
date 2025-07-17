// In a real application, this would involve validating a JWT, session, or API key.
// For now, we'll just simulate a logged-in user for development purposes.

const mockAuthMiddleware = (req, res, next) => {
  // Mock user object. In a real app, this would come from the database after validating credentials.
  
  // The frontend now specifies the store via localStorage, which we read from the header.
  const currentStoreIdFromHeader = req.headers['x-current-store-id'];
  
  // For convenience, also attach it directly to the request object
  req.currentStoreId = currentStoreIdFromHeader;

  req.user = {
    // A mock user ID
    _id: '60d0fe4f5311236168a109ca', // Example user ID
    name: '开发用户',
    // Dynamically set the current store ID based on the request header
    // The default storeId is now primarily handled by the frontend's localStorage logic.
    currentStoreId: currentStoreIdFromHeader,
    // In a real app, this would be a list of stores the user has access to.
    stores: [
      { storeId: '6878def4ae6e08fa4af88e34', role: 'admin' },
      { storeId: '6878df16ae6e08fa4af88e35', role: 'manager' }
    ]
  };
  
  // Pass control to the next middleware function in the stack
  next();
};

module.exports = mockAuthMiddleware; 