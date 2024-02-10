// A wrapper function for handling all the async calls.
// Using promises
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next))
      .catch((error) => next(error))
      .finally(() => {
        console.log("async handler executed!");
      });
  };
};

export { asyncHandler };

// Using try...catch
/* const asyncHandler = (cb) => async (req, res, next) => {
  try {
    await cb(req, res, next);
  } catch (error) {
    res.status(error?.code || 500).json({
      message: error?.message,
      success: false,
    });
  }
}; */
