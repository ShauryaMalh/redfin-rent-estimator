//content script js

(() => {

    let page = document.getElementsByClassName("customer-facing blueprint mercury DetailsPage desktopDP isContainerized route-HomeDetails")[0];
 

    // contentScript.js

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("ContentScript received:", message);

  switch (message.type) {
    case "VIEW":
      // Navigate to details.html for this address
      const address = message.value;
      window.location.href = `/details.html?address=${encodeURIComponent(address)}`;
      sendResponse({ status: "navigated", address });
      break;

    case "DELETE":
      // Could remove listing UI on page if needed
      sendResponse({ status: "deleted in DOM" });
      break;
  }
});


    function addNewListingEventHandler() {
    if (!page) {
        console.warn('Listing Page was not found');
        return;
    }

   function getValueByLabel(label) {
    // First check keyDetails section
    const rows = document.querySelectorAll('.keyDetails-row');
    for (const row of rows) {
        const type = row.querySelector('.valueType')?.textContent.trim();
        const value = row.querySelector('.valueText')?.textContent.trim();
        if (type?.toLowerCase() === label.toLowerCase()) {
            return value;
        }
    }
    return null;
}

function getMortgageBreakdownValue(label) {
    const rows = document.querySelectorAll(
        '.MortgageCalculator .colorBarLegend .Row'
    );

    for (const row of rows) {
        const type = row.querySelector('.Row--header')?.textContent.trim();
        let value =
            row.querySelector('.rowValueWithDialog')?.textContent.trim() ||
            row.querySelector('.Row--content')?.textContent.trim();

        if (type && type.toLowerCase() === label.toLowerCase()) {
            return value;
        }
    }

    return null;
}



    const street = document.querySelector('.street-address')?.textContent.trim();
    const cityStateZip = document.querySelector('.bp-cityStateZip')?.textContent.trim();
    const address = `${street ?? ''} ${cityStateZip ?? ''}`;
    //const propertyTaxPercentage= parseFloat(document.querySelector('.bp-Percent #propertyTaxStore')?.value?.trim().replace('%', ''));
    //const homeOwnersInsurancePercentage = parseFloat(document.querySelector('.bp-Percent #homeInsuranceStore')?.value?.trim().replace('%', ''));
    const propertyTaxRaw = getMortgageBreakdownValue("Property taxes");
    const insuranceRaw = getMortgageBreakdownValue("Homeowners insurance");



    const propertyTax = propertyTaxRaw
        ? parseFloat(propertyTaxRaw.replace(/[$,]/g, ''))
        : null;

    const homeOwnersInsurance = insuranceRaw
        ? parseFloat(insuranceRaw.replace(/[$,]/g, ''))
        : null;

    const priceRaw = document.querySelector('.price')?.textContent.trim().replace(/[$,]/g, '');
    const price = parseFloat(priceRaw);


    function cleanNumber(text) {
    if (text == null) return null;  // handles null and undefined

    // Always convert to string before replace
    const num = parseFloat(String(text).replace(/[^0-9.]/g, ""));
    return isNaN(num) ? null : num;
}

function normalizePropertyType(redfinType) {
    if (!redfinType) return "Single Family"; // default

    const type = redfinType.toLowerCase();

    if (type.includes("single")) return "Single Family";
    if (type.includes("condo")) return "Condo";
    if (type.includes("townhouse")) return "Townhouse";
    if (type.includes("co-op")) return "Condo"; // map co-ops to Condo
    if (type.includes("multi")) return "Multi-Family";
    if (type.includes("manufactured")) return "Manufactured";
    if (type.includes("apartment")) return "Apartment";

    // if "land" or anything unrecognized → default
    return "Single Family";
}
function extractRent(text) {
    if (!text) return null;

    // Check if 'rent' is in the text
    if (!text.toLowerCase().includes("rent")) return null;

    // Only runs if 'rent' is present
    const match = text.match(/\$?[\d,]+/);
    if (!match) return null;

    // Clean and parse the number
    return parseInt(match[0].replace(/[$,]/g, ""), 10);
}


 const newListing = {
    url: window.location.href,
    listingStatus: document.querySelector(".ListingStatusBannerSection.remodel.addressBannerRevamp")?.textContent.trim() || 
               document.querySelector(".bp-DefinitionFlyout.bp-DefinitionFlyout__underline")?.textContent.trim(),
    mlsNumber: document.querySelector(".ListingSource--mlsId")?.textContent.trim(),
    address: address,
    rentalEarnings: extractRent(document.querySelector(".MoreResourcesSection .ListItem.clickable .ListItem__description.font-body-small-compact.color-text-secondary")?.textContent?.trim()),
    principalInterest: document.querySelector('.Row--content.text-right')?.textContent.trim(),
    price: cleanNumber(price),
    beds: cleanNumber(document.querySelector('.beds-section .statsValue')?.textContent.trim()),
    baths: cleanNumber(document.querySelector(".bp-DefinitionFlyout.bath-flyout.bp-DefinitionFlyout__underline")?.textContent.trim()),
    sqft: cleanNumber(document.querySelector(".sqft-section .statsValue")?.textContent.trim()),
    lotSize: getValueByLabel("Lot Size"),
    yearBuilt: getValueByLabel("Year Built"),
    propertyType: normalizePropertyType(getValueByLabel("Property Type")),
    pricePerSqft: getValueByLabel("Price/Sq.Ft."),
    parking: getValueByLabel("Parking"),
    HOA: getValueByLabel("HOA Dues") || 0,
    propertyTax,            
    homeOwnersInsurance,    
    mainImage: document.querySelector(".landscape")?.src,
    desc: "Listing at " + address,
    scrapeDate: new Date().toISOString(),
    source: "Redfin"
};


// ✅ Use only one consistent message type
console.log("📤 Content sending SAVE_LISTING to background:", newListing);

chrome.runtime.sendMessage({ type: "SAVE_LISTING", listing: newListing }, (response) => {
    console.log("📥 Content got response from background:", response);
});


}


// This function adds the "Save" button to the toolbar
function addButton(toolbarContainer) {

        // Prevent adding the button multiple times
        if (document.querySelector(".listing-btn")) return;

        // Create outer wrapper for styling
        const outerWrapper = document.createElement("div");
        outerWrapper.className = "HomeControlButtonWrapper";

        // Create inner wrapper to match Redfin's toolbar styling
        const innerWrapper = document.createElement("div");
        innerWrapper.className = "bp-HomeActionsButton withLabel";

        // Create the actual button
        const button = document.createElement("button");
        button.type = "button"; // Standard button type
        button.className = "bp-Button bp-homeActionButton bp-Button__type--ghost bp-Button__size--compact listing-btn";
        button.title = "Click to save current listing"; // Tooltip text on hover

        // Create an icon span to hold the image
        const iconSpan = document.createElement("span");
        iconSpan.className = "ButtonIcon";

        // Create the image element for the icon
        const iconImg = document.createElement("img");
        iconImg.src = chrome.runtime.getURL("assets/bookmark.png"); // Load image from extension assets
        iconImg.style.width = "20px"; // Set image width
        iconImg.style.height = "20px"; // Set image height

        // Append the image inside the icon span
        iconSpan.appendChild(iconImg);

        // Create a label span for the button text
        const labelSpan = document.createElement("span");
        labelSpan.className = "ButtonLabel";
        labelSpan.textContent = "Save"; // The text displayed on the button

        // Combine the icon and label into the button
        button.appendChild(iconSpan);
        button.appendChild(labelSpan);

        // Put button into inner wrapper
        innerWrapper.appendChild(button);
        // Put inner wrapper into outer wrapper
        outerWrapper.appendChild(innerWrapper);
        // Finally, append the whole button to the toolbar container
        toolbarContainer.appendChild(outerWrapper);

        // Add click event to the button
        button.addEventListener("click", addNewListingEventHandler);


        page = document.getElementsByClassName("customer-facing blueprint mercury DetailsPage desktopDP isContainerized route-HomeDetails")[0];    }


// Create a MutationObserver to watch for changes in the DOM (useful for React apps that update dynamically)
//anonymous callback function will be automatically executed whenever the DOM changes
const observer = new MutationObserver(() => {
    // Try to find the toolbar container with the specific class
    const toolbarContainer = document.querySelector(".bp-pill-container-variant");

    // If the toolbar exists, add a button inside it
    // (Assumes addButton() has logic to avoid adding duplicates)
    if (toolbarContainer) {
        addButton(toolbarContainer);
    }
});

// Start observing changes in the entire body of the document
observer.observe(document.body, {
    childList: true, // Watch for elements being added or removed directly within observed nodes
    subtree: true    // Also watch changes in all descendants (deep nested elements)
});

})();
