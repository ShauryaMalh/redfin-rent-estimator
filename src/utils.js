//utils js
export async function getActiveTabURL() {
    // Define the query options: 
    // `active: true` → only get the currently active tab in the window  
    // `currentWindow: true` → restrict the search to the current browser window
    let queryOptions = { active: true, currentWindow: true };

    // Query Chrome's tabs API with the given options
    // This returns an array of matching tabs
    // The `await` ensures we wait until the query is complete
    let [tab] = await chrome.tabs.query(queryOptions);

    // Return the first (and only) tab found that matches the query
    return tab;
}
