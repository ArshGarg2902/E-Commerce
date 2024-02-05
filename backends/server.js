const express = require('express');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
// const session = require('express-session');
// const mongoDBSession = require('connect-mongodb-session')(session);
const mongoose = require('mongoose');
const User = require("./models/user");
const Product = require("./models/products");
const CartItem = require('./models/cartitems');
// const databaseUri = 'mongodb://127.0.0.1:27017/mydb'
require('dotenv').config();

db().then(res=>console.log("connected")).catch(err => console.log(err));
async function db() {
  await mongoose.connect(process.env.DB_URI);
}
// const store = new mongoDBSession({
//     uri:databaseUri,
//     collection:"sessions"
// })
const PORT = process.env.PORT || 3000;
const app = express();

//middleware
app.use(cookieParser());
app.use(express.urlencoded({extended:true}));
app.set('view engine','ejs');

// middleware to be called for all requests
app.use((req,res,next)=>{
    const {auth} = req.cookies;
    if(auth){
        req.isAuthenticated = true;
    }else{
        req.isAuthenticated = false;
    }
    next();
})

const isAuthenticated = (req,res,next)=>{
    if(req.isAuthenticated){
        next();
    }else{
        res.status(400).redirect("/login");
    }
}

// app.use(session({
//     secret:'thisisforsigningcookie',
//     resave:false,
//     saveUninitialized:false,
//     cookie:{
//         secure:false,
//         maxAge:60000
//     },
//     store:store
// }));

app.get('/', isAuthenticated, async (req, res) => {
    const products = await Product.find({})
    // Fetch cart items from the MongoDB collection
    const cartItems = await CartItem.find({}).populate('product');
    res.render('home', { products, cart: cartItems });

})

app.get('/logout',(req,res)=>{
    res.clearCookie("auth");
    res.status(200).redirect("/login");
})

// routing
app.get("/login",(req,res)=>{
    // req.session.isAuth = true;
    // console.log(req.session);
    // console.log(req.session.id);
    res.render('login');
})

app.post('/login', async (req,res)=>{

    const {username,password} = req.body;
    try{
        // check if the user exists 
        const user = await User.findOne({username});
        // check for the password
        if(user && bcrypt.compareSync(password,user.password)){
            res.cookie('auth',true);
            res.status(200).redirect('/');
        }else{
            res.status(401).render('login',{error:'Please check the username and password'})
        }
    }catch(error){
        console.log(error);
        res.status(500).render('login',{'error':'Internal server error'})
    }
});

app.get("/register",(req,res)=>{
    res.render('register')
})

app.post("/register",async (req,res)=>{
    console.log(req.body);
    const {username,password} = req.body;
    try{
        // check if the req body has username and password
        if(!username || !password){
            throw new Error('Enter username and password');
        }
        // check if username already exists in DB
        const existingUser = await User.findOne(({username}));
        if(existingUser){
            res.status(400).render('register',{'error':'Username already exists'})
            return
        }
        // encrypt the password
        const hashedPassword = bcrypt.hashSync(password,10);
        const newUser = new User({
            username,
            password:hashedPassword
        })
        // save to DB
        await newUser.save();
        // everything goes well, go to login page
        res.status(201).redirect('/login');
    }catch(error){
        console.log(error);
        res.status(500).render('register',{'error':'Internal server error'})
    }
})

// Get Cart
app.get('/cart', async (req, res) => {
  try {
      // Fetch cart items from the MongoDB collection
      const cartItems = await CartItem.find({}).populate('product');

      // Calculate total cart value
      const total = cartItems.reduce((acc, item) => acc + item.quantity * item.product.price, 0);

      res.render('cart', { cart: cartItems, total });
  } catch (error) {
      console.error('Error fetching cart items:', error);
      res.status(500).send('Internal Server Error');
  }
});

// Add a route for checkout
app.get('/checkout', async (req, res) => {
  try {
      const cartItems = await CartItem.find({}).populate('product');
      const total = cartItems.reduce((acc, item) => acc + item.quantity * item.product.price, 0);

      res.render('checkout', { cart: cartItems, total });
  } catch (error) {
      console.error('Error loading checkout:', error);
      res.status(500).send('Internal Server Error');
  }
});

// Add a route to handle the checkout process
app.post('/checkout', async (req, res) => {
  try {
      // Create an order based on cart items
      const cartItems = await CartItem.find({}).populate('product');

      // Assuming you have an Order model
      const newOrder = new Order({
          user: req.user, // Assuming you have a logged-in user
          products: cartItems.map(item => ({ product: item.product, quantity: item.quantity })),
          totalAmount: req.body.total, // You might want to validate this value
          status: 'placed' // Assuming this status signifies a successfully placed order
      });

      // Save the order to the database
      await newOrder.save();

      // Clear the cart after successful checkout
      await CartItem.deleteMany({});

      res.render('checkout-success'); // Render a success page
  } catch (error) {
      console.error('Error during checkout:', error);
      res.status(500).send('Internal Server Error');
  }
});




// add to cart post
app.post('/addToCart', async (req, res) => {
    try {
        const productId = req.body.productId;
        const quantity = parseInt(req.body.quantity);

        // Fetch the selected product
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).send('Product not found.');
        }

        // Check if the item is already in the cart
        const existingCartItem = await CartItem.findOne({ product: productId });

        if (existingCartItem) {
            // Update the quantity if the item is already in the cart
            existingCartItem.quantity += 1;
            await existingCartItem.save();
        } else {
            // Add a new item to the cart
            await CartItem.create({
                product: productId,
                quantity: quantity
            });
        }

        res.redirect('/');
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).send('Internal Server Error');
    }
});

//start server
app.listen(PORT,()=>{
    console.log(`Listening on ${PORT}`);
})