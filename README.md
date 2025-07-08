# 📦 Professional Backend Structure

A robust, modular, and production-ready backend template built using **Node.js**, **Express.js**, **MongoDB (Mongoose)**, **JWT authentication**, and **Cloudinary** for media uploads. This boilerplate is structured for scalability and serves as a great starting point for building YouTube-like applications.

## 📁 Project Structure

```
professional-backend-structure/
│
├── src/
│   ├── controllers/        # Route logic (e.g., user.controller.js)
│   ├── db/                 # MongoDB connection (index.js)
│   ├── middlewares/        # Auth, multer, etc.
│   ├── models/             # Mongoose schemas: User, Video, Comment, etc.
│   ├── routes/             # API routes
│   ├── utils/              # Helpers: ApiError, ApiResponse, etc.
│   ├── app.js              # Express app config
│   └── constants.js        # App-wide constants
│
├── public/temp/            # Temporary file storage
├── .gitignore
├── package.json
└── README.md               # You're reading it!
```

## 🚀 Features

* ✅ **Mongoose Models**: User, Video, Playlist, Tweet, Like, Comment, Subscription
* ✅ **JWT Authentication** with access & refresh tokens
* ✅ **File Uploads** using **Multer** & **Cloudinary** (images, videos)
* ✅ **Centralized Error Handling** using custom `ApiError` and `ApiResponse`
* ✅ **Async Handler Wrapper** for clean controller logic
* ✅ **Scalable Folder Structure**
* ✅ **Environment Config Ready**

## 🧱 Built With

* **Node.js** / **Express.js**
* **MongoDB** / **Mongoose**
* **Cloudinary** (Image & Video Uploads)
* **JWT** (Auth & Session Management)
* **Multer** (File handling)
* **dotenv** (Environment Configuration)

## 📦 Installation

```bash
git clone https://github.com/poshithNandyala/professional-backend-structure.git
cd professional-backend-structure
npm install
```

## 🔐 Environment Setup

Create a `.env` file in the root directory and add the following variables:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
CORS_ORIGIN=*
ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRY=10d
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

## 🧪 Run the App

To run the development server:

```bash
npm run dev
```

## 🧩 Customization

This boilerplate is designed to be easily extendable:

1. Add new models to `src/models/`
2. Register new routes in `src/routes/`
3. Create controllers in `src/controllers/` to handle business logic
4. Add helper utilities and services in `src/utils/`

## 📸 Example Use Case

This is a perfect starting point for:

* YouTube Clone
* Video/Media Sharing Apps
* Streaming Backend Services
* Educational Video Platforms

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

This project is open source and available under the MIT License.

## 💬 Contact

Created with ❤️ by **Poshith Nandyala**

Feel free to fork and build upon it!
