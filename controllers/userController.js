import User from '../models/User.js';

// @desc    Get all drivers
// @route   GET /api/auth/drivers
// @access  Private (Admin only)
export const getDrivers = async (req, res) => {
  try {
    const drivers = await User.find({ role: 'driver' })
      .select('name email _id')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: drivers.length,
      data: drivers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching drivers',
      error: error.message
    });
  }
};
