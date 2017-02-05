import m from "mithril";
import { classes } from "./classes";
import { getElementSize, isElementInViewport } from "./util";
import { page } from "./page";
import { placeholder } from "./placeholder";
import "./css";

const SCROLL_WATCH_TIMER = 200;
const SEL_PADDING = "000000";

const numToId = pageNum =>
  SEL_PADDING.substring(0, SEL_PADDING.length - ("" + pageNum).length) + pageNum;

const calculateCurrentPageNum = (scrollAmount, state) => {
  const pageNumKeys = state.sortedKeys;
  if (pageNumKeys.length === 0) {
    return 1;
  }
  let acc = state.beforeSize || 0;
  let currentPageNum = 1;
  for (let i = 0; i < pageNumKeys.length; i = i + 1) {
    let pageKey = pageNumKeys[i];
    if (scrollAmount > acc) {
      currentPageNum = parseInt(pageKey, 10);
    }
    acc += state.pageSizes[pageKey];
  }
  return currentPageNum;
};

const calculateContentSize = (from, to, state) => {
  const fromIndex = Math.max(0, from - 1);
  if (to < fromIndex) {
    return 0;
  }
  const toIndex = to;
  const pageNumKeys = state.sortedKeys.slice(fromIndex, toIndex);
  let size = state.beforeSize || 0;
  size = pageNumKeys.reduce((total, pageKey) => (
    total += state.pageSizes[pageKey] || 0
  ), size);
  size += state.afterSize || 0;
  return size;
};

const isPageInViewport = (page, axis, state, scrollView) => {
  if (!scrollView) {
    return false;
  }
  const id = numToId(page);
  const el = scrollView.querySelector(`[data-page="${id}"]`);
  return isElementInViewport({ el, axis });
};

const updatePageSize = state => (pageId, size) => (
  state.pageSizes[pageId] = size,
  state.sortedKeys = Object.keys(state.pageSizes).sort()
);

const handleScroll = (state, view, action) => {
  const scroll = () => {
    state.isScrolling = true;
    // reset isScrolling state only when scrolling is done
    clearTimeout(state.scrollWatchScrollingStateId);
    state.scrollWatchScrollingStateId = setTimeout(() => {
      state.isScrolling = false;
      // update pages
      m.redraw();
    }, state.scrollThrottle);
    // throttle updates while scrolling
    if (!state.scrollWatchUpdateStateId) {
      state.scrollWatchUpdateStateId = setTimeout(() => {
        // update pages
        m.redraw();
        state.scrollWatchUpdateStateId = null;
      }, state.scrollThrottle);
    }
  };
  if (action === "add") {
    view.addEventListener("scroll", scroll);
  } else {
    view.removeEventListener("scroll", scroll);
  }
};

const updatePart = (dom, whichSize, state, axis) => {
  const size = getElementSize(dom, axis);
  if (size) {
    state[whichSize] = size;
  }
};

const getPageList = (currentPageNum, fromPage, toPage, currentPage, preloadSlots, maxPages) => {
  const minPageNum = fromPage
    ? parseInt(fromPage, 10)
    : currentPage
      ? currentPage
      : 1;
  const maxPageNum = toPage
    ? parseInt(toPage, 10)
    : currentPage
      ? currentPage
      : maxPages;
  const pages = [];
  const prePages = [];
  for (let i = -preloadSlots; i <= preloadSlots; i = i + 1) {
    const pageNum = currentPageNum + i;
    if (pageNum >= minPageNum && pageNum <= maxPageNum) {
      pages.push(pageNum);
    }
  }
  for (let pageNum = 1; pageNum < pages[0]; pageNum = pageNum + 1) {
    prePages.push(pageNum);
  }
  return {pages, prePages, maxPageNum};
};

const oninit = vnode => {
  const attrs = vnode.attrs;
  // Memoize some properties that do not change
  const axis = attrs.axis || "y";
  const whichScroll = axis === "x" ? "scrollLeft" : "scrollTop";
  const autoSize = (attrs.autoSize !== undefined && attrs.autoSize === false) ? false : true;
  const pageSize = attrs.pageSize;
  const scrollThrottle = attrs.throttle !== undefined ? attrs.throttle * 1000 : SCROLL_WATCH_TIMER;
  const contentTag = attrs.contentTag || "div";
  const classList = [
    classes.scrollView,
    axis === "x"
      ? classes.scrollViewX
      : classes.scrollViewY,
    attrs.class
  ].join(" ");

  vnode.state = Object.assign(
    {},
    {
      pageSizes: {},
      sortedKeys: [],
      beforeSize: null,
      afterSize: null,
      scrollView: null,
      isScrolling: false,
      scrollWatchScrollingStateId: null,
      scrollWatchUpdateStateId: null,
      preloadSlots: attrs.preloadPages || 1,
      boundingClientRect: {},
      currentPageNum: 0,
      scrollAmount: 0,

      // Memoized
      classList,
      axis,
      whichScroll,
      autoSize,
      pageSize,
      scrollThrottle,
      contentTag
    }
  );
};

const view = ({state, attrs}) => {
  state.scrollAmount = state.scrollView ? state.scrollView[state.whichScroll] : 0;
  const axis = state.axis;
  const maxPages = attrs.maxPages !== undefined ? attrs.maxPages : Number.MAX_VALUE;

  const currentPageNum = attrs.currentPage
    ? parseInt(attrs.currentPage, 10)
    : calculateCurrentPageNum(state.scrollAmount, state);

  if (attrs.pageChange && currentPageNum !== state.currentPageNum) {
    attrs.pageChange(currentPageNum);
  }
  state.currentPageNum = currentPageNum;

  if (state.scrollView && attrs.getDimensions) {
    attrs.getDimensions({
      scrolled: state.scrollAmount,
      size: state.contentSize
    });
  }

  const {pages, prePages, maxPageNum} = getPageList(currentPageNum, attrs.from, attrs.to, attrs.currentPage, state.preloadSlots, maxPages);

  state.contentSize = calculateContentSize(1, maxPageNum, state);
  const isLastPageVisible = maxPageNum
    ? isPageInViewport(maxPageNum, axis, state, state.scrollView)
    : true;

  if (state.scrollView) {
    // in case the screen size was changed, reset preloadSlots
    const boundingClientRect = state.scrollView.getBoundingClientRect();
    state.boundingClientRect = state.boundingClientRect || boundingClientRect;
    if (boundingClientRect.width !== state.boundingClientRect.width
      || boundingClientRect.height !== state.boundingClientRect.height
    ) {
      state.preloadSlots = attrs.preloadPages || 1;
    }
    state.boundingClientRect = boundingClientRect;
    // calculate if we have room to load more
    const maxSlots = attrs.maxPreloadPages || Number.MAX_VALUE;

    if (state.contentSize
      && (state.preloadSlots < pages.length)
      && (state.preloadSlots <= maxSlots)
      && (state.contentSize < boundingClientRect.height)
    ) {
      state.preloadSlots++;
      setTimeout(m.redraw, 0);
    }
  }

  return m("div",
    {
      oncreate: ({ dom }) => {
        state.scrollView = attrs.scrollView
          ? document.querySelector(attrs.scrollView)
          : dom;
        state.scrollView.className += " " + state.classList;

        if (attrs.setDimensions) {
          const dimensions = attrs.setDimensions();
          if (dimensions.size > 0) {
            const whichSize = axis === "x"
              ? "width"
              : "height";
            dom.style[whichSize] = dimensions.size + "px";
          }
          state.scrollView[state.whichScroll] = dimensions.scrolled;
        }
        handleScroll(state, state.scrollView, "add");
      },
      onremove: () => handleScroll(state, state.scrollView, "remove")
    },
    m("div",
      {
        class: classes.scrollContent,
        style: !state.autoSize
          ? null
          : Object.assign(
            {},
            axis === "x"
              ? { width: state.contentSize + "px" }
              : { height: state.contentSize + "px" },
            attrs.contentSize
              ? axis === "x"
                ? { "min-width": attrs.contentSize + "px" }
                : { "min-height": attrs.contentSize + "px" }
              : {}
        )
      },
      [
        m(state.contentTag, { class: classes.content }, [
          attrs.before
            ? m("div", {
              class: classes.before,
              oncreate: ({ dom }) => updatePart(dom, "before", state, axis),
              onupdate: ({ dom }) => updatePart(dom, "before", state, axis)
            }, attrs.before)
            : null,
          m("div", { class: classes.pages }, [
            prePages.map(pageNum => 
              m(placeholder, Object.assign(
                {},
                {
                  axis,
                  key: numToId(pageNum),
                  pageId: numToId(pageNum),
                  pageNum,
                  pageSizes: state.pageSizes
                }
              ))
            ),
            pages.map(pageNum =>
              m(page, Object.assign(
                {},
                {
                  autoSize: state.autoSize,
                  axis,
                  isScrolling: state.isScrolling,
                  item: attrs.item,
                  key: numToId(pageNum),
                  pageData: attrs.pageData,
                  pageId: numToId(pageNum),
                  pageNum,
                  pageSize: state.pageSize,
                  pageSizes: state.pageSizes,
                  pageTag: attrs.pageTag,
                  pageUrl: attrs.pageUrl,
                  updatePageSize: updatePageSize(state)
                }
              ))
            )
          ]),
          // only show "after" when content is available
          attrs.after && state.contentSize
            ? m("div", {
              class: classes.after,
              style: {
                // visually hide this element until the last page is into view
                // to prevent flashes of after content when scrolling fast
                visibility: isLastPageVisible ? "visible" : "hidden"
              },
              oncreate: ({ dom }) => updatePart(dom, "after", state, axis),
              onupdate: ({ dom }) => updatePart(dom, "after", state, axis),
            }, attrs.after)
            : null
        ])
      ]
    )
  );
};

export const infinite = {
  oninit,
  view,
  isElementInViewport
};
