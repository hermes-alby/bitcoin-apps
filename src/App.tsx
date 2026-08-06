import { useEffect, useMemo, useState } from "react";
import { APPS } from "./data/apps";
import {
  CATEGORY_LABELS,
  PLATFORM_OPTIONS,
  PRODUCT_OPTIONS,
  PROTOCOL_OPTIONS,
  WALLET_SUBCATEGORY_LABELS,
  WALLET_SUBCATEGORY_ORDER,
} from "./data/discover";
import {
  cardsByCategory,
  featuredCards,
  filterApps,
  parseFiltersFromSearch,
  searchApps,
  toSearchParams,
  visibleCategories,
  walletCardsBySubcategory,
} from "./lib/discover";
import type { DiscoverFilters } from "./types/discover";
import { SearchBar } from "./components/search-bar";
import { CategoryPills } from "./components/category-pills";
import { FilterGroup } from "./components/filter-group";
import { FeaturedCard } from "./components/featured-card";
import { AppCard } from "./components/app-card";
import { FooterCta } from "./components/footer-cta";
import { Card } from "./components/ui/card";
import { assetPath } from "./lib/assets";

function App() {
  const [filters, setFilters] = useState<DiscoverFilters>(() => parseFiltersFromSearch(window.location.search));

  useEffect(() => {
    document.title = "Bitcoin Apps Directory";
  }, []);

  useEffect(() => {
    const params = toSearchParams(filters);
    const nextQuery = params.toString();
    const nextUrl = nextQuery.length > 0 ? `${window.location.pathname}?${nextQuery}` : window.location.pathname;
    window.history.replaceState(null, "", nextUrl);
  }, [filters]);

  const applyFilter = (patch: Partial<DiscoverFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    requestAnimationFrame(() => {
      document.getElementById("discover-top")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const filteredCards = useMemo(() => filterApps(APPS, filters), [filters]);
  const featured = useMemo(() => featuredCards(filteredCards), [filteredCards]);
  const byCategory = useMemo(() => cardsByCategory(filteredCards), [filteredCards]);
  const categories = useMemo(() => visibleCategories(byCategory, filters.category), [byCategory, filters.category]);
  const totalResults = useMemo(
    () => categories.reduce((sum, category) => sum + (byCategory.get(category)?.length ?? 0), 0),
    [categories, byCategory],
  );

  const searching = filters.q.trim().length > 0;
  const searchResultsMap = useMemo(() => {
    if (!searching) return undefined;
    return new Map(searchApps(APPS, filters.q).map((r) => [r.item.title, r]));
  }, [filters.q, searching]);

  return (
    <main className="bg-white">
      <section>
        <div className="discover-entry-image mx-auto mb-8 max-w-discover px-4 lg:px-0">
          <img src={assetPath("images/discover/top-background.png")} alt="Discover apps banner" className="h-auto w-full object-cover" />
        </div>
        <div className="mx-auto max-w-discover px-4 text-center">
          <h1 className="discover-entry-title mx-auto mb-4 font-['Figtree'] text-5xl font-bold leading-[110%] tracking-[-0.01em] sm:mb-8 sm:text-7xl">
            Bitcoin Apps Directory
          </h1>
          <h2 className="discover-entry-subtitle mx-auto mb-16 max-w-2xl font-['Figtree'] text-xl font-normal leading-[130%] tracking-[-0.01em] text-gray-600">
            A collection of apps, websites and services
            <br />
            to connect your bitcoin wallet to.
          </h2>
        </div>
      </section>

      <div className="pb-0">
        <div className="mx-auto max-w-discover px-4 lg:px-0">
          <SearchBar value={filters.q} onChange={(q) => setFilters((current) => ({ ...current, q }))} />

          {!searching && featured.length > 0 ? (
            <section className="mb-24 p-1">
              <h2 className="mb-6 text-xl text-secondary sm:text-2xl">Featured</h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {featured.map((app) => (
                  <FeaturedCard key={`featured-${app.title}`} app={app} />
                ))}
              </div>
            </section>
          ) : null}

          <div id="discover-top" aria-hidden="true" />

          {!searching ? (
            <section id="discover-filters" className="mb-12 rounded-xl bg-white pb-4 pt-4 md:sticky md:top-0 md:z-30">
              <CategoryPills
                selected={filters.category}
                onSelect={(category) => applyFilter({ category })}
              />
              <div className="grid grid-cols-1 items-start gap-x-4 gap-y-4 px-3 sm:grid-cols-2 lg:grid-cols-3">
                <FilterGroup
                  title="Platforms"
                  options={PLATFORM_OPTIONS}
                  selected={filters.platform}
                  onSelect={(platform) => applyFilter({ platform })}
                />
                <FilterGroup
                  title="Connect with Alby"
                  options={PRODUCT_OPTIONS}
                  selected={filters.product}
                  onSelect={(product) => applyFilter({ product })}
                />
                <FilterGroup
                  title="Connect with"
                  options={PROTOCOL_OPTIONS}
                  selected={filters.protocol}
                  onSelect={(protocol) => applyFilter({ protocol })}
                />
              </div>
            </section>
          ) : null}

          <div id="discover-results" />

          {categories.length === 0 && totalResults === 0 ? (
            <Card className="mb-12 rounded-xl border border-[#D1D5DB] bg-white p-8 text-center shadow-none">
              <h3 className="mb-2 text-2xl text-secondary">No apps match these filters</h3>
              <p className="mb-5 text-tertiary">Try adjusting one filter at a time.</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {filters.q ? (
                  <button
                    type="button"
                    className="discover-hover-sheen-premium rounded-full border border-[#D1D5DB] bg-white px-3 py-1.5 text-sm font-medium text-black transition-all duration-300 ease-out hover:border-[#FFEFB3] hover:bg-[linear-gradient(180deg,_#FFFDEA_-10.32%,_#FFF9BB_50.44%,_#FFE65C_104%,_#FFD500_155.95%)]"
                    onClick={() => setFilters((current) => ({ ...current, q: "" }))}
                  >
                    Clear search
                  </button>
                ) : null}
                {filters.category || filters.platform || filters.protocol || filters.product || filters.q ? (
                  <button
                    type="button"
                    className="discover-hover-sheen-premium rounded-full border border-[#D1D5DB] bg-white px-3 py-1.5 text-sm font-medium text-black transition-all duration-300 ease-out hover:border-[#FFEFB3] hover:bg-[linear-gradient(180deg,_#FFFDEA_-10.32%,_#FFF9BB_50.44%,_#FFE65C_104%,_#FFD500_155.95%)]"
                    onClick={() => setFilters({ q: "" })}
                  >
                    Clear all
                  </button>
                ) : null}
              </div>
            </Card>
          ) : null}

          {categories.map((category) => {
            const cards = byCategory.get(category) ?? [];
            if (category === "wallets") {
              const byWalletSubcategory = walletCardsBySubcategory(cards);
              return (
                <section key={category} className="mb-24">
                  <h2 className="mb-6 text-xl sm:text-2xl">{CATEGORY_LABELS[category]}</h2>
                  {WALLET_SUBCATEGORY_ORDER.map((subcategory) => {
                    const subcategoryCards = byWalletSubcategory.get(subcategory) ?? [];
                    return (
                      <div key={`${category}-${subcategory}`}>
                        <h3 className="mb-4 text-lg font-semibold text-secondary">{WALLET_SUBCATEGORY_LABELS[subcategory]}</h3>
                        {subcategoryCards.length > 0 ? (
                          <div className="mb-7 grid auto-rows-fr grid-cols-1 gap-5 sm:grid-cols-2">
                            {subcategoryCards.map((app) => {
                              const result = searchResultsMap?.get(app.title);
                              return (
                                <AppCard
                                  key={`${category}-${subcategory}-${app.title}`}
                                  app={app}
                                  titleRanges={result?.matches?.[0] ?? undefined}
                                  descriptionRanges={result?.matches?.[1] ?? undefined}
                                />
                              );
                            })}
                          </div>
                        ) : (
                          <Card className="mb-7 rounded-xl border border-gray-300 bg-white p-5 text-sm text-tertiary shadow-none">
                            No apps in this subcategory for active filters.
                          </Card>
                        )}
                      </div>
                    );
                  })}
                </section>
              );
            }

            return (
              <section key={category} className="mb-24">
                <h2 className="mb-6 text-xl sm:text-2xl">{CATEGORY_LABELS[category]}</h2>
                {cards.length > 0 ? (
                  <div className="mb-7 grid auto-rows-fr grid-cols-1 gap-5 sm:grid-cols-2">
                    {cards.map((app) => {
                      const result = searchResultsMap?.get(app.title);
                      return (
                        <AppCard
                          key={`${category}-${app.title}`}
                          app={app}
                          titleRanges={result?.matches?.[0] ?? undefined}
                          descriptionRanges={result?.matches?.[1] ?? undefined}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <Card className="mb-7 rounded-xl border border-gray-300 bg-white p-5 text-sm text-tertiary shadow-none">
                    No apps in this category for active filters.
                  </Card>
                )}
              </section>
            );
          })}

          <FooterCta />
        </div>
      </div>
    </main>
  );
}

export default App;
