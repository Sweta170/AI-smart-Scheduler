const { oauth2Client } = require('../config/googleOAuth');
const User = require('../models/User');

const refreshIfExpired = async (userId) => {
  const user = await User.findById(userId)
    .select('+googleCalendar.accessToken +googleCalendar.refreshToken +googleCalendar.tokenExpiry');

  if (!user || !user.googleCalendar || !user.googleCalendar.connected) {
    throw new Error('Google Calendar is not connected for this user');
  }

  const now = new Date();
  const expiry = new Date(user.googleCalendar.tokenExpiry);
  
  // Refresh if token expires within 5 minutes or has already expired
  if (expiry - now < 5 * 60 * 1000) {
    try {
      oauth2Client.setCredentials({
        refresh_token: user.googleCalendar.refreshToken
      });
      
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      // Save new tokens to MongoDB
      await User.findByIdAndUpdate(userId, {
        'googleCalendar.accessToken': credentials.access_token,
        'googleCalendar.tokenExpiry': new Date(credentials.expiry_date)
      });
      
      return credentials.access_token;
    } catch (error) {
      console.error('[GOOGLE TOKEN REFRESH ERROR]:', error.message);
      // If refresh fails permanently, mark googleCalendar.connected = false and prompt reconnect
      await User.findByIdAndUpdate(userId, {
        'googleCalendar.connected': false
      });
      throw new Error('Google token refresh failed. Please reconnect your calendar.');
    }
  }
  
  return user.googleCalendar.accessToken;
};

module.exports = refreshIfExpired;
