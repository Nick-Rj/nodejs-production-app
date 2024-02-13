import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend.
  // validation - not empty
  // check if user already exists: username, email
  // check for images, check for avatar.
  // upload them to cloudinary, avatar.
  // create user object - create entry in db
  // remove password and refresh token field from response
  // check for user creation.
  // return response.

  const { fullName, email, username, password } = req.body;
  console.log("email:", email);
  console.log("fullName:", fullName);
  console.log("username:", username);

  // if (fullName === "") {
  //   throw new ApiError(400, "fullname is required!");
  // }
  // Validating multiple fields sequentially.

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required!");
  }

  const existingUser = await User.findOne({
    // Checking for multiple fields
    $or: [{ username }, { email }],
  });

  if (existingUser) {
    throw new ApiError(409, "User with email or username already exists!");
  }

  // All data is fetched through req.body.
  // In the same way, req.files gives access for all the files uploaded by the multer.
  // There are multiple properties provided by the file fields.
  // TODO: log req.files and observe the data.
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
  console.log("All files", req.files, Array.isArray(req.files));

  // let coverImageLocalPath;
  // if (
  //   req.files &&
  //   Array.isArray(req.files) &&
  //   req.files.coverImage.length > 0
  // ) {
  //   coverImageLocalPath = req.files.coverImage[0].path;
  // }

  const coverImageLocalPath =
    req.files &&
    req.files.coverImage &&
    Array.isArray(req.files?.coverImage) &&
    req.files.coverImage.length > 0
      ? req.files.coverImage[0].path
      : "";

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required!");
  }

  // Uploading files on Cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  // Validate for Cloudinary path
  if (!avatar) {
    throw new ApiError(400, "Avatar file is required!");
  }
  // Create the object and insert it into the database.
  const user = await User.create({
    fullName,
    avatar: avatar?.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username?.toLowerCase(),
  });

  // validating the new user added.
  // select method is used for unchecking the fields which are not required.
  const createdUser = await User.findById(user?._id).select(
    "-password -refreshToken"
  );

  // If user not found, throw an error.
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user!");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully!"));
});

export { registerUser };
