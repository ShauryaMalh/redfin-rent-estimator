// popup.js
console.log('popup.js loaded.')
// Render one listing row
const addNewListing = (listingElement, listing) => {
    const listingTitleElements = document.createElement("div");

    let street = listing.address;
    let city = listing.cityStateZip || "";

    if (street.includes(",")) {
        const parts = street.split(",");
        street = parts[0].trim();          // "10269 Eastridge Dr NE"
        city = parts[1]?.trim() || city;   // "Redmond"
    }

    listingTitleElements.textContent = city ? `${street} – ${city}` : street || "Unnamed Listing";
    listingTitleElements.className = "listing-title";
    listingTitleElements.href = listing.url;              //  link to Redfin
    listingTitleElements.target = "_blank";               //  open in new tab
    listingTitleElements.classList.add("listing-link");   // optional styling

    listingTitleElements.addEventListener("click", () => {
        chrome.tabs.create({ url: listing.url });
    });


    const controlsElement = document.createElement("div");
    controlsElement.className = "listing-controls";

    const safeAddress = listing.address || "unknown";
    const safeId = safeAddress.replace(/[^a-zA-Z0-9_-]/g, "_");

    const newListingElement = document.createElement("div");
    newListingElement.id = "listing-" + safeId;
    newListingElement.setAttribute("address", safeAddress);
    newListingElement.className = "listing";

    setListingAttributes("viewMore", onView, controlsElement);
    setListingAttributes("delete", onDelete, controlsElement);

    newListingElement.appendChild(listingTitleElements);
    newListingElement.appendChild(controlsElement);

    listingElement.appendChild(newListingElement);
};


// Display all Listings in the popup
const viewListings = (currentListings = []) => {
    const listingElement = document.getElementById("listings");
    if (!listingElement) {
        console.error("Element with ID 'listings' not found in the DOM.");
        return;
    }

    listingElement.innerHTML = "";

    if (currentListings.length === 0) {
        listingElement.innerHTML = '<i class="row">No bookmarks to show</i>';
        return;
    }

    // Group listings by status
    const grouped = groupListingsByStatus(currentListings);

    Object.keys(grouped).forEach(status => {
        // Wrapper for this status group
        const groupWrapper = document.createElement("div");
        groupWrapper.className = "status-wrapper";

        // Header with arrow
        const statusHeader = document.createElement("div");
        statusHeader.className = "status-header";
        statusHeader.innerHTML = `
            <span>${status}</span>
            <span class="arrow">▼</span>
        `;

        // Container for listings under this status
        const statusGroup = document.createElement("div");
        statusGroup.className = "status-group";

        grouped[status].forEach(listing => {
            addNewListing(statusGroup, listing);
        });

        // Toggle collapse on click
        statusHeader.addEventListener("click", () => {
            statusGroup.classList.toggle("collapsed");
            statusHeader.classList.toggle("collapsed");
        });

        // Append header and group to wrapper
        groupWrapper.appendChild(statusHeader);
        groupWrapper.appendChild(statusGroup);

        // Append wrapper to main listing container
        listingElement.appendChild(groupWrapper);
    });
};

// === Handlers ===
const onView = async (e) => {
    const listingAddress = e.target.closest(".listing")?.getAttribute("address");
    console.log("👀 View button clicked for:", listingAddress);

    chrome.runtime.sendMessage(
        { type: "VIEW", value: listingAddress },
        (response) => {
            console.log("VIEW response:", response);
        }
    );
};
const onDelete = async (e) => {
    const listingAddress = e.target.closest(".listing")?.getAttribute("address");
    const safeId = listingAddress.replace(/[^a-zA-Z0-9_-]/g, "_");
    const listingElementToDelete = document.getElementById("listing-" + safeId);
    if (listingElementToDelete) listingElementToDelete.remove();

    const response = await sendMessageToBackground({ type: "DELETE", value: listingAddress });
    console.log("DELETE response:", response);

    viewListings(response.savedListings || []); // ✅ use savedListings
};

// Utility for control buttons
const setListingAttributes = (src, eventListener, controlParentElement) => {
    const controlElement = document.createElement("img");
    controlElement.src = chrome.runtime.getURL("assets/" + src + ".png");
    controlElement.onerror = () => {
        controlElement.src = chrome.runtime.getURL("assets/" + src + ".jpeg");
    };
    controlElement.title = src;
    controlElement.addEventListener("click", eventListener);
    controlParentElement.appendChild(controlElement);
};

// Group listings by status (e.g. Active, Pending)
const groupListingsByStatus = (listings) => {
    return listings.reduce((groups, listing) => {
        const status = listing.listingStatus?.toUpperCase() || "UNKNOWN";
        if (!groups[status]) groups[status] = [];
        groups[status].push(listing);
        return groups;
    }, {});
};

// Helper to message background
const sendMessageToBackground = (message) => {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(message, (response) => resolve(response));
    });
};

// Auto-refresh when storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (changes.savedListings) {
        viewListings(changes.savedListings.newValue || []);
    }
});

// Init on popup load
document.addEventListener("DOMContentLoaded", () => {

    chrome.runtime.sendMessage({ type: "getListings" }, (response) => {
        console.log("Popup received listings:", response);
        viewListings(response.savedListings || []); // ✅ use savedListings
    });
});


//Styles
document.addEventListener("DOMContentLoaded", () => {
  const logo = document.getElementById("logo");
  logo.src = chrome.runtime.getURL("assets/bookmark.png");
});

//Db Creation:

// When user clicks Export CSV button
document.getElementById("exportCsvBtn").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "EXPORT_CSV" }, (response) => {
        if (response?.status === "OK") {
            const blob = new Blob([response.csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = "listings.csv"; // 👈 file name
            a.style.display = "none";

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            URL.revokeObjectURL(url); // cleanup
        } else {
            console.error("❌ Failed to export CSV");
        }
    });
});



