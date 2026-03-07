const express = require("express")
const bwip = require("bwip-js")
const {product_model,dash_model,alert_model,tax_model,audit_model} = require("../../config/database")
const mongoose = require("mongoose")
const router = express.Router()
const { v4: uuidv4 } = require("uuid")

router.use(express.urlencoded({ extended: true }))

router.get("/", async (req,res)=>{
    try{
        return res.render("admin/products/add",{"display":"Add Product",userDP:req.session.adminDP})
    }catch(err){
        console.error("Add Product Page Error:",err)
        return res.status(500).send("Internal Server Error")
    }
})

router.post("/data", async (req,res)=>{

    const session = await mongoose.startSession()
    session.startTransaction()

    try{

        function generateBarcodeNum() {
               const time = Date.now().toString().slice(-10)
                const rand = Math.floor(Math.random() * 10000)
            .toString()
            .padStart(4, '0')
            return time + rand
        }

        const barcodeNum = generateBarcodeNum()

        if(!req.body.name){
            throw new Error("Product name missing")
        }

        const new_id = uuidv4()
        let attribute_object = {}
        const category = req.body.category

        console.log(req.body)

        // ----- Attribute Logic (UNCHANGED) -----

        if(category == "readymade"){
            attribute_object = {  
                "readymadeLength":req.body.readymadeLength,
                "readymadeFit":req.body.readymadeFit,
                "readymadeDesign":req.body.readymadeDesign,
                "readymadeSleeve":req.body.readymadeSleeve,
                "readymadeSize":req.body.readymadeSize,
                "readymadeType":req.body.readymadeType,
                "readymadeFabricType" : req.body.readymadeFabricType,
                "readymadeNeckline" : req.body.readymadeNeckline
            }

            if(req.body.readymadeType == "blouseStitched"){
                attribute_object.readymadeBlouseLining = req.body.readymadeBlouseLining
                attribute_object.readymadeBlouseClosure = req.body.readymadeBlouseClosure
                attribute_object.readymadeBlouseBack = req.body.readymadeBlouseBack
            }

        }else if(category == "sarees"){

            attribute_object = {
                "sareeLength":req.body.sareeLength,
                "sareeWidth":req.body.sareeWidth,
                "sareeDesign":req.body.sareeDesign,
                "blouseIncluded":req.body.blouseIncluded,
                "sareeFabricType" : req.body.sareeFabricType
            }

            if(req.body.blouseIncluded == "yes"){
                attribute_object.blouseDesign = req.body.blouseDesign
                attribute_object.blouseType = req.body.blouseType
                attribute_object.blouseMaterial = req.body.blouseMaterial
                attribute_object.blouseFabricType = req.body.blouseFabricType

                if(req.body.blouseType == "unstitched"){
                    attribute_object.blouseLength = req.body.blouseLength
                    attribute_object.blouseLining = req.body.blouseLining

                }else if(req.body.blouseType == "semi-stitched"){
                    attribute_object.blouseLength = req.body.blouseLength
                    attribute_object.blouseChest = req.body.blouseChest
                    attribute_object.blouseLining = req.body.blouseLining
                    attribute_object.blouseSleeve = req.body.blouseSleeve

                }else if(req.body.blouseType == "stitched"){
                    attribute_object.blouseSize = req.body.blouseSize
                    attribute_object.blouseLining = req.body.blouseLining
                    attribute_object.blouseSleeve = req.body.blouseSleeve
                    attribute_object.blouseClosure = req.body.blouseClosure
                    attribute_object.blouseBack = req.body.blouseBack
                }
            }

        }else if(category == "blouse"){

            attribute_object = {
                "blouseDesign":req.body.blouseDesign,
                "blouseType":req.body.blouseType,
                "blouseFabricType" : req.body.blouseFabricType,
                "blouseLining":req.body.blouseLining
            }

            if(req.body.blouseType == "unstitched"){
                attribute_object.blouseLength = req.body.blouseLength
            }else if(req.body.blouseType == "semi-stitched"){
                attribute_object.blouseLength = req.body.blouseLength
                attribute_object.blouseChest = req.body.blouseChest
                attribute_object.blouseSleeve = req.body.blouseSleeve
            }

        }else if(category == "wraps"){

            attribute_object = {
                "wrapType":req.body.wrapType,
                "wrapLength":req.body.wrapLength,
                "wrapWidth":req.body.wrapWidth,
                "wrapDesign":req.body.wrapDesign,
                "wrapFabricType" : req.body.wrapFabricType 
            }

        }else if(category == "jewellery"){

            attribute_object = {
                "jewelleryType":req.body.jewelleryType,
                "jewelleryCraft":req.body.jewelleryCraft,
                "jewelleryWeight":req.body.jewelleryWeight
            }
        }
        //MRP To Base price -
        const taxset = await tax_model.find({}) 
        const tax_slab_shift = 2500
        function removeGSTFromProduct(reqBody){

            const taxInfo = taxset.find(y => String(y.hsnCode) === String(reqBody.hsnCode))

            if(!taxInfo){
                console.warn("Missing tax info for HSN", reqBody.hsnCode);
                return null;
            }
            console.log(taxInfo)

            let rate = taxInfo  .gstRate1;

            // SAME slab logic as gstCalc
            if(!(reqBody.category == "sarees" || 
                reqBody.category == "stoles" || 
                reqBody.category == "dupattas")){

                if(Number(reqBody.price) > tax_slab_shift && taxInfo.gstRate2){
                    rate = taxInfo.gstRate2;
                }
            }

            const inclusive = Number(reqBody.price);

            const base = inclusive / (1 + rate/100);
            const roundedBase = Number(base.toFixed(2));

            const gstAmount = Number((inclusive - roundedBase).toFixed(2));

            return {
                base_price: roundedBase,
                gst_rate: rate,
                extracted_gst: gstAmount
            };
        }
        const gstResult = removeGSTFromProduct(req.body);


        // ----- Database Insert -----

        await product_model.create([{
            name:req.body.name,
            id:new_id,
            barcode:barcodeNum,
            barcodePrintCount:0,
            hsnCode:req.body.hsnCode,
            state:"Active",
            category:req.body.category,
            description:req.body.description,
            price:Number(gstResult.base_price),
            mrp:req.body.price,
            material:req.body.material,
            stock:req.body.stock,
            images:[
                req.body.image1,
                req.body.image2,
                req.body.image3,
                req.body.image4,
                req.body.image5,
                req.body.image6
            ],
            attributes:attribute_object
        }], { session })

        await dash_model.updateMany({},{
            $inc:{"adminSeshActions.productAdded":1},
            $set:{
                "adminSeshActions.message":"New Product Added",
                "adminSeshActions.messageHead":"Product Addition"
            }
        }, { session })
        await audit_model.insertOne({
                    actionUser:req.session.admin,
                    actionType:"Product Addition",
                    actionTarget:`${barcodeNum}`
        
        },{session})

        await alert_model.updateOne({},{$set:{updateAlert:true}}, { session })


        await session.commitTransaction()
        session.endSession()

        req.session.confirmation = `Name : ${req.body.name}`
        console.log(req.session.pageNum)
       res.redirect(`/admin/products/allProducts?page=${req.session.pageNum}&search=all`)

    }catch(err){

        await session.abortTransaction()
        session.endSession()

        console.error("Error in adding new product to database:",err)
        return res.status(500).send("Product Creation Failed")
    }
})

module.exports = router
