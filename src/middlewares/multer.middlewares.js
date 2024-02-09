import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // req: provides the entire data in json format.
    // file: provides the list of all the files uploaded.
    cb(null, "/public/temp");
  },
  filename: function (req, file, cb) {
    // const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // cb(null, file.fieldname + "-" + uniqueSuffix);
    cb(null, file.originalname);
  },
});

export const upload = multer({ storage: storage });
