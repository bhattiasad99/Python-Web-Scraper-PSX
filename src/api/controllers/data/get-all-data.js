import { OK_SUCCESS, UNKNOWN_SERVER_ERROR } from "./../../../config/index.js";
import { failure, success } from "../../../utils/helpers/responses.js";
import puppeteer from "puppeteer";

async function scrapeStockSymbols() {
  try {
    // Launch a headless browser
    const browser = await puppeteer.launch();

    // Open a new page and navigate to the website
    const page = await browser.newPage();
    await page.goto("https://dps.psx.com.pk/historical");

    // Wait for the table and select tag to load
    await page.waitForSelector("#historicalTable");
    await page.waitForSelector('select[name="historicalTable_length"]');

    // Select 'Show 100' option from the dropdown
    const selectElement = await page.$('select[name="historicalTable_length"]');
    await selectElement.select("100");

    // Extract stock symbols from the table
    const symbols = [];
    while (true) {
      // Extract stock symbols from the table
      const rows = await page.$$(".tbl__body tr");
      for (let row of rows) {
        let el = await row.$$("td");
        // get only first element because that is the symbol
        const text = await el[0].getProperty("textContent");
        const value = await text.jsonValue();
        symbols.push({ symbol: value });
      }

      // Check if there's a next page
      const nextButton = await page.$("#historicalTable_next");
      if (nextButton) {
        // Click the next button and wait for the page to load
        // const isDisabled = await nextButton.c
        const isDisabled = await nextButton.evaluate(
          (button) => button.classList.contains("disabled"),
          nextButton
        );
        if (isDisabled) {
          break;
        }
        await nextButton.click();
        await page.waitForSelector("table");
      } else {
        break;
      }
    }

    // Close the browser and return the stock symbols
    await browser.close();
    return { error: false, symbols };
  } catch (err) {
    return {
      error: true,
      message: err.message,
    };
  }
}

export default async (req, res) => {
  try {
    const symbols = await scrapeStockSymbols();
    console.log({ symbols });
    // now build another function that takes historical data for each

    if (symbols.error) {
      return failure(
        req,
        res,
        UNKNOWN_SERVER_ERROR,
        "00008",
        symbols.error.message
      );
    }
    return success(
      req,
      res,
      OK_SUCCESS,
      "00094",
      "GETTING ALL DATA",
      undefined,
      { symbols }
    );
  } catch (err) {
    return failure(req, res, UNKNOWN_SERVER_ERROR, "00008", err.message);
  }
};
