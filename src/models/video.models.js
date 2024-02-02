import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
  {
    videoFile: {
      type: String, // cloudinary url
      required: [true, "Please provide video URL!"],
    },
    thumbnail: {
      type: String, // cloudinary url
      required: [true, "Please provide thumbnail URL!"],
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    title: {
      type: "String",
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    duration: {
      type: Number, // video duration from cloudinary
      required: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

//Adding mongooseAggregatePaginate as a plugin in the videoSchema.
videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);
