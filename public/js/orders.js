//Query Filter Code - 
const itemCount = document.querySelector(".item-count")
itemCount.textContent = `${(window.dataset).length} Orders`


const paymentStatus = document.querySelectorAll("#payment-status")
.forEach(el=>{
    if(el.textContent == "paid"){
        el.style.backgroundColor = "var(--pill-green-bg)"  
        el.style.color = "var(--pill-green-text)"
        el.textContent = "Paid"
    }
    else if(el.textContent == "semiPaid"){
        el.style.backgroundColor = "var(--pill-orange-bg)"  
        el.style.color = "var(--pill-orange-text)"
        el.textContent = "Semi-Paid"

    }
    else if(el.textContent == "pending"){
        el.style.backgroundColor = "var(--pill-red-bg)"  
        el.style.color = "var(--pill-red-text)"
        el.textContent = "Pending"

    }else if(el.textContent == "payLater"){
        el.style.backgroundColor = "var(--pill-orange-bg)"  
        el.style.color = "var(--pill-orange-text)"
        el.textContent = "Pay-Later"
    }
    else if(el.textContent == "refunded"){
        el.style.backgroundColor = "var(--pill-red-bg)"  
        el.style.color = "var(--pill-red-text)"
        el.textContent = "Refunded"
    }
    
})
function titleCase(str) {
  return str
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}


const orderStatus = document.querySelectorAll("#order-status")
.forEach(el=>{
    if(el.textContent == "completed" || el.textContent == "accepted"||el.textContent == "packaged" ||el.textContent == "dispatched"){
        el.style.backgroundColor = "var(--pill-blue-bg)"  
        el.style.color = "var(--pill-blue-text)"
        el.textContent = titleCase(el.textContent)
    }else if(el.textContent == "cancelled"||el.textContent == "returned"){
        el.style.backgroundColor = "var(--pill-red-bg)"  
        el.style.color = "var(--pill-red-text)"
        el.textContent = titleCase(el.textContent)

    }
})
document.querySelectorAll(".table-body-row").forEach(row => {
    row.addEventListener("click", () => {
        const url = row.dataset.href
        if (url) {
            window.location.href = url
        }
    })
})
const searchInput = document.querySelector("#searchBox");

// 1️⃣ Restore from URL (on page load)
const params = new URLSearchParams(window.location.search);
const searchFromUrl = params.get("search");
let page = parseInt(params.get("page")) || 1;
document.querySelector(".page-num").textContent = page

if (searchFromUrl) {
  searchInput.value = searchFromUrl;
}

// 2️⃣ On change, redirect
searchInput.addEventListener("change", () => {
  const value = searchInput.value.trim();
  if (!value) return;
  const url = `/admin/orders?page=${page}&search=${encodeURIComponent(value)}`;
  // store LAST orders URL
  localStorage.setItem("orders_last_url", url);
  window.location.href =
    `/admin/orders?page=${page}&search=${encodeURIComponent(value)}`;
});
const next = document.querySelector("#next")

next.addEventListener("click",()=>{
  const params = new URLSearchParams(window.location.search);
  let page = parseInt(params.get("page")) || 1;
  const search = params.get("search") || "";
  page++; // move to next page
  window.location.href = `/admin/orders?page=${page}&search=${encodeURIComponent(search)}`;

})
const prev = document.querySelector("#prev")

prev.addEventListener("click",()=>{
  const params = new URLSearchParams(window.location.search);
  let page = parseInt(params.get("page")) || 1;
  const search = params.get("search") || "";
  if(page == 1){
        window.showAlert("info","You are already on the 1st Page")
    return

  }else{
    page--
  } // move to next page
  window.location.href = `/admin/orders?page=${page}&search=${search}`;

})