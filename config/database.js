//Mongoose To MongoDB
const mongoose = require("mongoose")
require("dotenv").config()
const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB Connected");
};
module.exports = mongoose
productSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    id:{
        type:String,
        required:true
    },
    barcode:{
        type:String,
        required:true,
        unique:true
    },
    barcodePrintCount:{
      type:Number
    },  
    hsnCode:{
        type:Number,
        required:true
    },
    category:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    price:{
        type:Number,
        required:true,
        min: 0
    },
    mrp:{
      type:Number
    },
    state:{
      type:String
    },
    material:{
        type:String,
        required:true
    },
    stock:{
        type:Number,
        required:true,
        min: 0
    },
    images:{
        type:[String],

    },
    attributes: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      required:true
    },
    dateCreated:{
        type:Date,
        default:Date.now,
        required:true
    }
})
const taxSchema = new mongoose.Schema({
  hsnCode: {
    type: String,
    required: true
  },
  name:{
    type:String,
    required:true
  },
  gstRate1:{
    type:Number,
    required:true
  },
  gstRate2:{
    type:Number,
    required:true
  }
});
const orderSchema = new mongoose.Schema({

  orderId: {
    type: String,
    required: true,
    unique: true
  },
  invoiceNumber:{
    type:String,
    unique:true
  },

  date: {
    type: Date,
    default: Date.now
  },

  customerMobile:{
    type: String
  },
  customerName:{
    type:String
  },

  orderType: {
    type: String, // "IN_STORE" | "Deliverable"
    required: true
  },
  paymentUpdateDate:{
    type:String

  },
  statusUpdateDate:{
    type:String
  },
  paymentInfo:{
    paymentStatus:String,
    paymentMode:String,
    semiPaidAmount:Number,
  },
  items_info: [
    {
      productId: String,
      name: String,
      hsnCode: String,
      barcode:Number,
      quantity: Number,
      unitPrice: Number,
      totalDiscount: Number,
      taxableValue: Number,
      gstRate: Number,
      gstAmount: Number,
      lineTotal: Number
    }
  ],

  summary: {
    subTotal: Number,
    itemDiscountTotal: Number,
    orderDiscountTotal:Number,
    gstTotal: Number,
    taxableTotal:Number,
    grandTotal: Number
  },

  delivery_info: {
    address: String,
    distance:String,
    receiverType:String,
    receiverName:String,
    receiverNumber:Number
  },
  orderStatus:{
    type:String
  }

});
const draftOrderSchema = new mongoose.Schema({
  orderObject:{
    type: mongoose.Schema.Types.Mixed,
    default: {},
  }
})
const invoiceSchema = new mongoose.Schema({
  financialYear:{
    type:String,
    required:true
  },
  lastInvoiceNumber:{
    type:Number,
    required:true
  }
})
const auditSchema = new mongoose.Schema({
  actionDate:{
    type: Date,
    default: Date.now,
    required:true
  },
  actionUser:{
    type:String,
    required:true
  },
  actionType:{
    type:String,
    required:true
  },
  actionTarget:{
    type:String,
    required:true
  }


})
const alertSchema = new mongoose.Schema({
  itemAddAlert:{
    type:Boolean
  },
  orderAddAlert:{
    type:Boolean
  },
  removeAlert:{
    type:Boolean
  },
  updateAlert:{
    type:Boolean
  },
  invoiceAlert:{
    type:Boolean
  }
})
const dashboardSchema = new mongoose.Schema({
  brandOrders:{
    totalOrders:Number,
    ordersToday:Number,
    ordersMonth:Number,
    ordersAccepted:Number,
    ordersPackaged:Number,
    ordersDispatched:Number,
    ordersDeliveredToday:Number,
    ordersPending:Number,
    ordersInStoreToday:Number,
    ordersReturnedToday:Number,
    ordersReturnedTotal:Number
  },
  brandRevenue:{
    revenueTotal:Number,
    revenueToday:Number,
    revenueMonth:Number,
    gstToday:Number,
    gstMonth:Number,
    cgstToday:Number,
    sgstToday:Number,
    igstToday:Number,
    ordersPayLater:Number,
    ordersSemiPay:Number,
    revenueInStore:Number,
    revenueDelivered:Number,
    revenueOutstanding:Number

  },
  brandUsers:{
    usersTotal:Number,
    usersVisitToday:Number,
    usersNewToday:Number,
    usersNewMonth:Number,
    usersVisitMonth:Number,
    usersBuyRate:Number
  },
  brandStock:{
    total:Number,
    inStock:Number,
    outStock:Number,
  },
  adminSeshActions:{
    message:String,
    messageHead:String,
    productAdded:Number,
    productDeleted:Number,
    productUpdated:Number,
    productSold:Number
  },
  currentDate:{
    type:String
  },
  currentMonth:{
    type:String
  }

})
const dash_model = mongoose.model("dash_model",dashboardSchema)
const alert_model = mongoose.model("alert_model",alertSchema)
const draft_model = mongoose.model("draft_model",draftOrderSchema)
const tax_model = mongoose.model("tax_model",taxSchema)
const product_model = mongoose.model("product_model",productSchema)
const invoice_model = mongoose.model("invoice_model",invoiceSchema)
const order_model = mongoose.model("order_model",orderSchema)
const audit_model = mongoose.model("audit_model",auditSchema)
module.exports = {connectDB,product_model,tax_model,order_model,invoice_model,draft_model,alert_model,dash_model,audit_model}

