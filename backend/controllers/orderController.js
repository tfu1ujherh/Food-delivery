import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Placing user order for frontend
const placeOrder = async (req, res) => {
  const frontend_url = "https://food-delivery-frontend-s2l9.onrender.com";
  try {
    const { userId, items, amount, address } = req.body;

    if (!userId || !items || !amount || !address) {
      return res.status(400).json({ success: false, message: "Invalid input" });
    }

    const newOrder = new orderModel({
      userId,
      items,
      amount,
      address,
    });

    await newOrder.save();
    await userModel.findByIdAndUpdate(userId, { cartData: {} });

    const line_items = items.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(item.price * 100), // Ensures no floating-point issues
      },
      quantity: item.quantity,
    }));

    line_items.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: "Delivery Charges",
        },
        unit_amount: 200, // Delivery charges fixed at $2
      },
      quantity: 1,
    });

    const session = await stripe.checkout.sessions.create({
      line_items,
      mode: "payment",
      success_url: `${frontend_url}/verify?success=true&orderId=${newOrder._id}`,
      cancel_url: `${frontend_url}/verify?success=false&orderId=${newOrder._id}`,
    });

    res.status(200).json({ success: true, session_url: session.url });
  } catch (error) {
    console.error("Error in placeOrder:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Verifying the order payment
const verifyOrder = async (req, res) => {
  const { orderId, success } = req.body;

  if (!orderId || typeof success === "undefined") {
    return res.status(400).json({ success: false, message: "Invalid input" });
  }

  try {
    if (success === "true") {
      await orderModel.findByIdAndUpdate(orderId, { payment: true });
      res.status(200).json({ success: true, message: "Payment Successful" });
    } else {
      await orderModel.findByIdAndDelete(orderId);
      res.status(200).json({ success: false, message: "Payment Failed" });
    }
  } catch (error) {
    console.error("Error in verifyOrder:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Fetching user orders
const userOrders = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: "Invalid input" });
    }

    const orders = await orderModel.find({ userId }).sort({ createdAt: -1 }); // Sort by recent orders
    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error("Error in userOrders:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Listing orders for admin panel
const listOrders = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: "Invalid input" });
    }

    const userData = await userModel.findById(userId);

    if (userData && userData.role === "admin") {
      const orders = await orderModel.find({}).sort({ createdAt: -1 }); // Sort by recent orders
      res.status(200).json({ success: true, data: orders });
    } else {
      res.status(403).json({ success: false, message: "Unauthorized access" });
    }
  } catch (error) {
    console.error("Error in listOrders:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Updating order status
const updateStatus = async (req, res) => {
  try {
    const { userId, orderId, status } = req.body;

    if (!userId || !orderId || !status) {
      return res.status(400).json({ success: false, message: "Invalid input" });
    }

    const userData = await userModel.findById(userId);

    if (userData && userData.role === "admin") {
      await orderModel.findByIdAndUpdate(orderId, { status });
      res.status(200).json({ success: true, message: "Status Updated Successfully" });
    } else {
      res.status(403).json({ success: false, message: "Unauthorized access" });
    }
  } catch (error) {
    console.error("Error in updateStatus:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export { placeOrder, verifyOrder, userOrders, listOrders, updateStatus };
