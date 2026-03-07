const express = require("express")
const bwip = require("bwip-js")
const {product_model} = require("../../config/database")
const router = express.Router()
router.get("/regenerate/:barcode", async (req, res) => {
  const barcode = req.params.barcode;

  if (!barcode || barcode.length > 50) {
    return res.status(400).json({ error: "Invalid barcode" });
  }

  try {
    const png = await bwip.toBuffer({
      bcid: "code128",
      text: barcode,
      scale: 2,
      height: 14,
      includetext: true,        
      textxalign: "center",
    });

    res.writeHead(200, {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="barcode-${barcode}.png"`,
    });

    return res.end(png);

  } catch (err) {
    console.error("Barcode Regeneration Failed:", err);
    return res.status(500).json({ error: "Barcode generation failed" });
  }
});

// Helper: Build Mongo Query
function getDateRange(type) {
            const now = new Date();
            let start, end;

            const startOfDay = d =>
                new Date(d.getFullYear(), d.getMonth(), d.getDate());

            if (type === "tdy") {
                start = startOfDay(now);
                end = new Date(start);
                end.setDate(end.getDate() + 1);
            }

            if (!start || !end) return null;

            return { $gte: start, $lt: end };
        }
let arcSearch = ""
let resetPrint = false
function buildQuery(search) {
    if (!search || search === "all") {
        return {};
    }


    const split = search.split("-");
    const dbQuery = {};

    const Qmap = {
        stk: "stock",
        nm: "name",
        cat: "category",
        mat:"material",
        hsn: "hsnCode",
        bd: "barcode",
        dt:"dateCreated",
        prt:"barcodePrintCount",
        arc:"state"
    };

    for (let i = 0; i < split.length; i += 2) {
        const key = split[i];
        const value = split[i + 1];

        const dbField = Qmap[key];
        if (!dbField || !value) continue;
         if(key === "dt"){
            const range = getDateRange(value)
            if(range){
                dbQuery[dbField] = range
            }
            continue
        }else if(key === "arc"){
            arcSearch=value
        }else{
            arcSearch = "active"
        }

        dbQuery[dbField] = value;
    }

    return dbQuery;
}

// Route
router.get("/allProducts", async (req, res) => {
    try {
        const search = req.query.search || "";
        let page = parseInt(req.query.page) || 1;
        req.session.pageNum = page
        const limit = 40;

        if (page < 1) page = 1;

        const skip = (page - 1) * limit;

        const dbQuery = buildQuery(search);
        dbQuery.state = {$ne:"archived"} 

        const products = await product_model
            .find(dbQuery)
            .skip(skip)
            .limit(limit)
            .lean(); // cleaner output
        // if (resetPrint && products.length > 0) {
        //     const ids = products.map(p => p._id);

        //     await product_model.updateMany(
        //         { _id: { $in: ids } },
        //         { $set: { barcodePrintCount: 0 } }
        //     );
        // }

        return res.render("admin/products/allProducts", {
            display: "Products",
            data: products,
            currentPage: page,
            userDP:req.session.adminDP,
            alertMessage:[]
        });

    } catch (err) {
        console.error("Product Page Render Error:", err);
        return res.status(500).render("error-page", {
            message: "Something went wrong."
        });
    }
});
router.get("/barcodePrint",async(req,res)=>{
     try {
        const search = req.query.search || "";
        let query = req.originalUrl.split('?')[1] || ''
        let page = parseInt(req.query.page) || 1;
        const limit = 40;

        if (page < 1) page = 1;

        const skip = (page - 1) * limit;

        const dbQuery = buildQuery(search);

        const products = await product_model
            .find(dbQuery)
            .skip(skip)
            .limit(limit)
            .lean(); // cleaner output
        console.log(query)
        req.session.barcodePrintQuery = query

        return res.render("barcode_print", {
            products,
            queryString: query
        });

    } catch (err) {
        console.error("Barcode Print Page Error:", err);
        return res.status(500).render("error-page", {
            message: "Something went wrong."
        });
    }
})
router.get("/barcodePrintReset",async (req,res)=>{
     try {
    const search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    const limit = 40;

    if (page < 1) page = 1;

    const skip = (page - 1) * limit;
    const dbQuery = buildQuery(search);

    // Get current page IDs
    const pageProducts = await product_model
      .find(dbQuery)
      .skip(skip)
      .limit(limit)
      .select("_id");

    const ids = pageProducts.map(p => p._id);

    // Decrement safely
    if (ids.length) {
      await product_model.updateMany(
        { _id: { $in: ids }, barcodePrintCount: { $gt: 0 } },
        { $set: { barcodePrintCount: 0 } }
      );
    }

    // Fetch updated products
    const products = await product_model
      .find(dbQuery)
      .skip(skip)
      .limit(limit)
      .lean();

    return res.render("admin/products/allProducts", {
            display: "Products",
            data: products,
            currentPage: page,
            userDP:req.session.adminDP,
            alertMessage:["success","Barcode Print Count of Products Set to 0"]
        });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }

})
router.get("/updatePrintCount",async (req,res)=>{
    const search = req.query.search || "";
        let page = parseInt(req.query.page) || 1;
        const limit = 40;
        console.log(`page - ${page} , search - ${search}`)

        if (page < 1) page = 1;

        const skip = (page - 1) * limit;

        const dbQuery = buildQuery(search);

        const products = await product_model
            .find(dbQuery)
            .skip(skip)
            .limit(limit)
            .lean(); // cleaner output
        const idArray = products.map(product => product._id);
        await product_model.updateMany(
        { _id: { $in: idArray } },
        { $inc: { barcodePrintCount: 1 } }
        );
        return res.redirect(`/admin/products/allProducts?${req.session.barcodePrintQuery}`)



})
//Exports - 
module.exports = router

