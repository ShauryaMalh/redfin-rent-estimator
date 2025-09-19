// Details.js

console.log("detail.js loaded");

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const address = params.get("address");
  if (!address) {
    document.body.innerHTML = "<p>❌ No address provided.</p>";
    return;
  }

  // Load all listings from storage
  const listings = await new Promise((resolve) => {
    chrome.storage.sync.get("savedListings", (result) => {
      resolve(result.savedListings || []);
    });
  });

  const listing = listings.find(l => l.address === address);
  if (!listing) {
    document.body.innerHTML = "<p>❌ Listing not found.</p>";
    return;
  }

  // Fill details
  let street = listing.address;
  let city = listing.cityStateZip || "";

  if (street.includes(",")) {
    const parts = street.split(",");
    street = parts[0].trim();          // "10269 Eastridge Dr NE"
    city = parts[1]?.trim() || city;   // "Redmond"
  }

  const listingTitle = document.getElementById("listingTitle");

  // Build formatted title
  const formattedTitle = `Redfin - ${street}, ${city}` || listing.address;

  // Wrap in anchor with class
  listingTitle.innerHTML = `<a href="${listing.url}" target="_blank" class="listing-link">${formattedTitle}</a>`;

  document.getElementById("listingImage").src = listing.mainImage || "assets/no-image.png";
  document.getElementById("address").textContent = listing.address || "N/A";
  document.getElementById("status").textContent = listing.listingStatus || "N/A";
  document.getElementById("price").textContent = listing.price ? `$${Number(listing.price).toLocaleString()}` : "N/A";
  document.getElementById("beds").textContent = listing.beds || "N/A";
  document.getElementById("baths").textContent = listing.baths || "N/A";
  document.getElementById("sqft").textContent = listing.sqft || "N/A";
  document.getElementById("lotSize").textContent = listing.lotSize || "N/A";
  document.getElementById("yearBuilt").textContent = listing.yearBuilt || "N/A";
  document.getElementById("propertyType").textContent = listing.propertyType || "N/A";
  document.getElementById("parking").textContent = listing.parking || "N/A";
  document.getElementById("hoa").textContent = listing.HOA || "N/A";
  document.getElementById("propertyTax").textContent = listing.propertyTax || "N/A";
  document.getElementById("insurance").textContent = listing.homeOwnersInsurance || "N/A";

  // Back button
  document.getElementById("backBtn").addEventListener("click", () => {
    window.close(); // just close the detail window
  });

  // Analyze button (placeholder ML model integration)
  document.getElementById("analyzeBtn").addEventListener("click", async () => {

    try {
      function cleanMoney(val) {
        if (!val || val.toString().trim() === "") return 0;
        return parseFloat(
          val.toString()
            .replace("$", "")
            .replace(",", "")
            .replace("/mo", "")
            .trim()
        ) || 0;
      }

      const payload = {
        HOA: listing.HOA || "$0",
        baths: listing.baths || 0,
        beds: listing.beds || 0,
        price: listing.price || "$0",
        sqft: listing.sqft || 0,
        propertyType: listing.propertyType || "Unknown",
        listingStatus: listing.listingStatus || "Unknown",
        principalInterest: listing.principalInterest || "$0",
        propertyTax: listing.propertyTax || "$0",
        homeOwnersInsurance: listing.homeOwnersInsurance || "$0",
        pricePerSqft: listing.pricePerSqft || "$0"
      };

      const response = await fetch('http://127.0.0.1:5000/predict', {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok) {
        console.log('📊 Received model data');
        const rent = result.predictedRentalEarnings || 0;
        document.getElementById("aiScore").textContent = `$${Number(rent).toLocaleString()}`;
        const cost = cleanMoney(listing.HOA) + cleanMoney(listing.principalInterest) + cleanMoney(listing.propertyTax) + cleanMoney(listing.homeOwnersInsurance);
        const rentPercent = (rent / cost) * 100;

        document.getElementById("aiSummary").textContent =
          cost === 0
            ? "No cost data available."
            : rentPercent >= 100
              ? "This property looks like a great investment — rent covers all costs."
              : rentPercent >= 80
                ? "This property could expect some out-of-pocket expenses."
                : rentPercent >= 50
                  ? "This investment may be risky; rent covers only part of your costs."
                  : "This property doesn't meet ROI criteria and may be a poor investment.";

      } else {
        // API returned an error
        document.getElementById("aiScore").textContent = "❌ Error";
        document.getElementById("aiSummary").textContent = result.error || "Unknown error";
      }

    } catch (err) {
      console.error(err);
      document.getElementById("aiScore").textContent = "❌ Error";
      document.getElementById("aiSummary").textContent = "Could not reach the API.";
    }

  });

});
