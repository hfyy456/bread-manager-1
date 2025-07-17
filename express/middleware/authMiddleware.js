// In a real application, this would involve validating a JWT, session, or API key.
// For now, we'll just simulate a logged-in user for development purposes.

const mockAuthMiddleware = (req, res, next) => {
  // Mock user object. In a real app, this would come from the database after validating credentials.
  req.user = {
    // A mock user ID
    _id: '60d0fe4f5311236168a109ca', // Example user ID
    name: '开发用户',
    // We'll hardcode the "杭州IN77" store ID for now.
    // This simulates the user having selected a store to work with.
    currentStoreId: '6878def4ae6e08fa4af88e34', 
    // In a real app, this would be a list of stores the user has access to.
    stores: [
      { storeId: '6878def4ae6e08fa4af88e34', role: 'admin' },
      { storeId: '6878df16ae6e08fa4af88e35', role: 'manager' }
    ]
  };
  
  // Pass control to the next middleware function in the stack
  next();
};

module.exports = { mockAuthMiddleware }; 