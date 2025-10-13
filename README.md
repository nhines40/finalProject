# Social Media Login

## Prerequisites for running locally

Node.js
MongoDB

## Setup

1. Clone this repository
2. Install the dependencies using `npm install <dependency>`
3. Create a new MongoDB database and add the connection string to the mongoose.connect() function in server.js

## Transpiler
Whenever the code in `public/app.js` is updated the code need to be transpiled running the command `npx esbuild public/app.js --bundle --outfile=public/app-transpiled.js` and the resulting code in `public/app-transpiled.js` will be ran as the app

## Running the Project

1. Start your MongoDB server either in the MongoDB Compass UI or on the command line and update the mongodb url in `server.js`
2. Start the server by running `npm start`
3. Open a web browser and go to `http://localhost:3000`

## Troubleshooting Guides

1. Connecting to MongoDB: Double heck the MongoDB connection string and ensure that the database is running/connected.