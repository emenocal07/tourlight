import { createTour } from "@emenocal07/tourlight";

export const STORAGE_KEY = "tourlight-example";

export const { TourProvider, TourStep, useTour } = createTour(
  {
    search: {
      order: 1,
      title: "Search",
      content: "Type here to find anything in the library.",
    },
    filters: {
      order: 2,
      title: "Filters",
      content: "Pick a category. This step is interactive: try the select.",
      interactive: true,
    },
    library: {
      order: 3,
      title: "Your library",
      content:
        "Every card lives here. Scroll the page and the highlight follows.",
    },
  },
  { maxShows: 3, storageKey: STORAGE_KEY },
);
