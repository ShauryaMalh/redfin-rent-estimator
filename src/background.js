// background.js
console.log("🚀 Background service worker loaded");

// Listen for messages
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log("📩 Background received message:", msg, "from", sender);

    switch (msg.type) {
        case "SAVE_LISTING":
            console.log("💾 Handling SAVE_LISTING");
            chrome.storage.sync.get("savedListings", (result) => {
                let listings = result.savedListings || [];
                const exists = listings.some(l => l.address === msg.listing.address); // Check if any saved listing already has the same address as the new listing


                if (!exists) {
                    listings.push(msg.listing);
                    console.log("✅ New listing saved:", msg.listing);
                } else {
                    console.log("ℹ️ Listing already exists:", msg.listing.address);
                }

                chrome.storage.sync.set({ savedListings: listings }, () => {
                    console.log("📦 Updated savedListings:", listings);
                    sendResponse({ status: "OK", savedListings: listings }); // ✅ consistent
                });
            });
            return true; // Keep sendResponse alive

        case "getListings":
            console.log("📥 Handling getListings");
            chrome.storage.sync.get("savedListings", (result) => {
                console.log("📤 Returning saved listings:", result.savedListings);
                sendResponse({ savedListings: result.savedListings || [] }); // ✅ consistent
            });
            return true;

        case "DELETE":
            console.log("🗑️ Handling DELETE for:", msg.value);
            chrome.storage.sync.get("savedListings", (result) => {
                let listings = result.savedListings || [];
                listings = listings.filter(l => l.address !== msg.value);

                chrome.storage.sync.set({ savedListings: listings }, () => {
                    console.log("🗑️ Deleted listing:", msg.value);
                    console.log("📦 Updated savedListings:", listings);
                    sendResponse({ status: "OK", savedListings: listings }); // ✅ consistent
                });
            });
            return true;

        case "VIEW":
        console.log("👀 Handling VIEW for:", msg.value);

        chrome.windows.create({
            url: chrome.runtime.getURL(`src/detail/detail.html?address=${encodeURIComponent(msg.value)}`),
            type: "popup",
            width: 800,
            height: 550
        });

        sendResponse({ status: "OK", action: "VIEW" });
        break;

        case "EXPORT_CSV":
        console.log("📤 Handling EXPORT_CSV");

        chrome.storage.sync.get("savedListings", async (result) => {
            let listings = result.savedListings || [];

            // Helper to call RentCast API for rent estimate
            async function fetchRentEstimate(listing) {
                try {
                    const url = `https://api.rentcast.io/v1/avm/rent/long-term?` +
                        `address=${encodeURIComponent(listing.address || "")}` +
                        `&propertyType=${encodeURIComponent(listing.propertyType || "Single Family")}` +
                        `&bedrooms=${encodeURIComponent(listing.beds || "")}` +
                        `&bathrooms=${encodeURIComponent(listing.baths || "")}` +
                        `&squareFootage=${encodeURIComponent(listing.sqft || "")}` +
                        `&compCount=5`;

                    const options = {
                        method: "GET",
                        headers: {
                            accept: "application/json",
                            "X-Api-Key": "YOUR API KEY HERE" // 🔑 your RentCast API key
                        }
                    };

                    const response = await fetch(url, options);

                    if (!response.ok) {
                        console.warn("⚠️ RentCast request failed:", response.status, response.statusText);
                        listing.rentalEarningsRawResponse = { error: `HTTP ${response.status}` };
                        return null;
                    }

                    const data = await response.json();

                    // ✅ log and attach raw response for debugging
                    console.log("📦 RentCast API response for", listing.address, data);
                    listing.rentalEarningsRawResponse = data;

                    // Save all three rent fields from the API
                    listing.rentalEarnings = typeof data?.rent === "number" ? data.rent : null;
                    listing.rentalLow = typeof data?.rentRangeLow === "number" ? data.rentRangeLow : null;
                    listing.rentalHigh = typeof data?.rentRangeHigh === "number" ? data.rentRangeHigh : null;

                    // Track data source
                    listing.rentalEarningsSource = "RentCast";

                    return listing.rentalEarnings;

                } catch (err) {
                    console.error("❌ RentCast API error for", listing.address, err);
                    listing.rentalEarningsRawResponse = { error: err.message };
                    return null;
                }
            }

            // Fetch only if value is truly missing
            let updatedAny = false;
            for (const listing of listings) {
                const hasValue =
                    listing.rentalEarnings !== null &&
                    listing.rentalEarnings !== undefined &&
                    !Number.isNaN(listing.rentalEarnings);

                console.log("Checking rentalEarnings for:", listing.address, listing.rentalEarnings);

                if (!hasValue) {
                    console.log("➡️ No estimate found, calling API");
                    const estimate = await fetchRentEstimate(listing);
                    if (typeof estimate === "number" && !Number.isNaN(estimate)) {
                        updatedAny = true;
                    } else {
                        console.log("↩️ API did not return a number; leaving value as null");
                    }
                } else {
                    console.log("✅ Already has rentalEarnings, skipping API");
                }
            }

            // Cache successful estimates
            if (updatedAny) {
                chrome.storage.sync.set({ savedListings: listings });
            }

            // Convert listings to CSV
            const headers = Object.keys(listings[0] || {});
            const headerLine = headers.join(",") + "\n";
            const rows = listings
                .map((l) =>
                    headers
                        .map((h) => {
                            const v = l[h];
                            const s = v == null ? "" : String(v);
                            return `"${s.replace(/"/g, '""')}"`;
                        })
                        .join(",")
                )
                .join("\n");

            const csv = headerLine + rows;

            console.log("✅ Generated CSV for", listings.length, "listings");
            sendResponse({ status: "OK", csv });
        });

        return true; // Keep sendResponse alive





        }
});



chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install" || details.reason === "update") {
        console.log("Firing alarm to check listings");
        chrome.alarms.create("checkListings", { periodInMinutes: 720 });
    }
});


chrome.alarms.onAlarm.addListener(async (alarm) =>{
    if(alarm.name !== 'checkListings') return;

    const { savedListings } = await chrome.storage.sync.get("savedListings");
    if (!savedListings || savedListings.length === 0) {
        console.log("ℹ️ No saved listings found.");
        return;
    }

    for(let listing of savedListings){
        if (!listing.url) {
            console.warn("⚠️ Listing missing URL, skipping:", listing);
            continue;
        }

       try {
            // Open the page in a background tab (without focusing)
            let tab = await chrome.tabs.create({ url: listing.url, active: false });

            // Wait a few seconds for page load (can be improved with listeners)
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Inject scraper into the page
            const res = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                function cleanNumber(text) {
                    if (!text) return null;
                    const num = parseFloat(String(text).replace(/[^0-9.]/g, ""));
                    return isNaN(num) ? null : num;
                }

                const priceRaw = document.querySelector('.price')?.textContent.trim();
                const price = cleanNumber(priceRaw);

                const status =
                    document.querySelector(".ListingStatusBannerSection.remodel.addressBannerRevamp")?.textContent.trim() ||
                    document.querySelector(".bp-DefinitionFlyout.bp-DefinitionFlyout__underline")?.textContent.trim();

                return { price, status };
            }
        });


            // Close the tab to avoid clutter
            chrome.tabs.remove(tab.id);

            const [{ result }] = res;
            if (!result) continue;

            const { price, status } = result;
            const changed =
                (listing.price && listing.price !== price) ||
                (listing.listingStatus && listing.listingStatus !== status);

            if (changed) {
                console.log("📈 Change detected for:", listing.address, { old: listing, new: result });

                // Notify user
                chrome.notifications.create({
                    type: "basic",
                    iconUrl: "icon.png",
                    title: "Listing Update",
                    message: `${listing.address}\nPrice: ${price || "N/A"} | Status: ${status || "N/A"}`
                });

                // Update the stored listing
                listing.price = price;
                listing.listingStatus = status;
            }
        } catch (err) {
            chrome.notifications.create({
                type: "basic",
                iconUrl: "icon.png",
                title: "Scraping Error",
                message: `Could not update ${listing.address}. Check console for details.`
            });
            }

    }

    // Save updated listings back
    await chrome.storage.sync.set({ savedListings });
    console.log("📦 Saved updated listings after scraping");
});

