const User = require("../models/userModel");
const Blog = require("../models/blogModel");
const { sendToken } = require("../utils/auth");
const nodemailer = require("nodemailer");
const formidable = require("formidable");
const cloudinary = require("cloudinary");

cloudinary.config({
  cloud_name: "du8ykqrv5",
  api_key: "226725129774491",
  api_secret: "hzADEQzsO2XXX3edCDkB9zBnpN0",
  secure: true,
});

exports.homepage = (req, res, next) => {
  res.json({ message: "This is homepage...", user: req.user });
};

exports.currentuser = (req, res) => {
  res.status(200).json({ user: req.user });
};

exports.signup = async (req, res, next) => {
  try {
    let user = await User.findOne({ email: req.body.email }).exec();
    if (user) {
      return res.status(501).json({ message: "user exists" });
    }
    const newUser = new User(req.body);
    user = await newUser.save();
    sendToken(user, req, res, 200);
  } catch (error) {
    res.status(501).json({ message: error.message });
  }
  // res.json({})
};

exports.signin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    let user = await User.findOne({ email }).select("+password").exec();
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    const matchpassword = user.comparepassword(password);

    if (!matchpassword) {
      return res.status(500).json({ message: "wrong credientials" });
    }

    sendToken(user, req, res, 200);
  } catch (error) {
    res.status(501).json({ message: error.message });
  }
  // res.json({})
};

exports.signout = (req, res, next) => {
  res.clearCookie("token");
  res.status(200).json({ message: "logged out sexsexfully" });
};

exports.sendmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email }).exec();
    console.log(user)
    if (!user) {
      return res.status(404).json({ message: "user not found." });
    }
    const pageurl =
      req.protocol + "://" + req.get("host") + "/forget-password/" + user._id;
    // res.status(200).json({ message: pageurl });

    const transport = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 465,
      auth: {
        user: "abhyuday9111@gmail.com",
        pass: process.env.MAIL_PASS,
      },
    });

    const mailOptions = {
      from: "Abhyuday<abhyuday9111@gmail.com>",
      to: req.body.email,
      subject: "Password Reset Link",
      text: "Do not share this link to anyone.",
      html: `<a href=${pageurl}>Click to redirect to password reset page</a>`,
    };

    transport.sendMail(mailOptions, async (err, info) => {
      if (err) return res.status(500).json({ message: err });
      // console.log(info);
      await User.findByIdAndUpdate(user._id, { passwordResetToken: 1 });
      res.status(200).json({
        message: "Email sent! check inbox/spam",
      });
    });
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error });
  }
};

exports.forgetpassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("+password").exec();
    if (user.passwordResetToken === 1) {
      user.passwordResetToken = 0;
      user.password = req.body.password;
      await user.save();
      res.status(200).json({ message: "password changed!" });
    } else {
      res.status(500).json({ message: "link expired! try again" });
    }
  } catch (error) {
    res.status(500).json({ message: error });
  }
};

exports.upload = async (req, res) => {
  try {
    const form = formidable();
    form.parse(req, async (err, fields, files) => {
      if (err) return res.status(500).json({ message: err });
      const user = await User.findById(req.user._id).exec();
      if (files) {
        const { public_id, secure_url } = await cloudinary.v2.uploader.upload(
          files.image.filepath,
          {
            folder: "editor",
            width: 1920,
            crop: "scale",
          }
        );
        user.avatar = { public_id, url: secure_url };
        await user.save();
        res.status(200).json({ message: "Image Uploaded" });
      } else {
        res.status(500).json({ message: "No file uploaded" });
      }
    });
  } catch (error) {
    res.status(500).json(error);
  }
};

exports.createstories = async (req, res) => {
  try {
    const blog = new Blog({ ...req.body, author: req.user._id });
    await req.user.stories.push(blog._id);
    await blog.save();
    await req.user.save();
    res.status(201).json({ message: "blog posted" });
  } catch (error) {
    res.status(500).json({ message: error });
  }
};

exports.blogs = async (req, res) => {
  try {
    const blogs = await Blog.find().exec();
    res.status(200).json({ message: "all blogs", blogs });
  } catch (error) {
    res.status(500).json({ message: error });
  }
};

exports.showstories = async (req, res) => {
  try {
    const { stories } = await User.findById(req.user._id)
      .populate("stories")
      .exec();
    console.log(stories);
    res.status(201).json({ message: "user blogs", stories });
  } catch (error) {
    res.status(500).json({ message: error });
  }
};

exports.showlists = async (req, res) => {
  try {
    const { lists } = await User.findById(req.user._id)
      .populate("lists")
      .exec();
    console.log(lists);
    res.status(201).json({ message: "user blogs", lists });
  } catch (error) {
    res.status(500).json({ message: error });
  }
};

// my deleteblog

exports.deleteblog = async (req, res) => {
  const blogId = req.params.id;
 
  // if(req.user.stories){
  //   console.log(req.user.stories)
  // }
  try {
    // Find the blog by its ID and remove it from the database
    const deletedBlog = await Blog.findByIdAndDelete(blogId);
    if (!deletedBlog) {
      return res.status(404).send('Blog not found');
    }
    return res.send(`Blog deleted successfully`);
  } catch (error) {
    console.error(error);
    return res.status(500).send('Internal server error');
  }
};

// my listblog

exports.listblog = async (req, res) => {
  const { blogid } = req.params;
  const userr = await User.findById(req.user._id);

  try {
    if (!userr.lists.includes(blogid)) {
      userr.lists.push(blogid);

      await userr.save();
      //   console.log("if lists", user.lists);
      req.user = userr;
      await req.user.save();

      //   console.log("if user", req.user);
      res.status(200).json({ message: "blog saved to user list" });
    } else {
      const blogIndex = userr.lists.indexOf(blogid);
      let templists = [...userr.lists];
      templists.splice(blogIndex, 1);
      userr.lists = templists;

      await userr.save();
      console.log("else lists", userr.lists);
      req.user = userr;
      await req.user.save();

      //   console.log("else user", req.user);
      res.status(200).json({ message: "blog unsaved from user list" });
    }
  } catch (error) {
    res.status(500).json({ message: error });
  }
};

// exports.listblog = async (req, res) => {
//     try {
//         const { blogid } = req.params;
//         if (!req.user.lists.includes(blogid)) {
//             req.user.lists.push(blogid);
//             await req.user.save();
//             res.status(200).json({ message: "blog saved to user list" });
//         } else {
//             const blogIndex = req.user.lists.findIndex(
//                 (blog) => blog._id === blogid
//             );
//             req.user.lists.splice(blogIndex, 1);
//             await req.user.save();
//             res.status(200).json({ message: "blog unsaved from user list" });
//         }
//     } catch (error) {
//         res.status(500).json({ message: error });
//     }
// };

exports.uploadBlog = async (req, res) => {
  try {
    const form = formidable();
    form.parse(req, async (err, fields, files) => {
      if (err) return res.status(500).json({ message: err });
      if (files) {
        console.log(files);
        const { public_id, secure_url } = await cloudinary.v2.uploader.upload(
          files.blog.filepath,
          {
            folder: "editorblog",
            width: 1920,
            crop: "scale",
          }
        );

        res.status(200).json({
          success: 1,
          file: {
            url: secure_url,
          },
        });
      } else {
        res.status(500).json({ message: "No file uploaded" });
      }
    });
  } catch (error) {
    res.status(500).json(error);
  }
};
