import React, { useEffect, useState, useRef } from "react";
import { DataTable } from "primereact/datatable";
import type { DataTablePageEvent } from "primereact/datatable";
import { Column } from "primereact/column";
import { Toast } from "primereact/toast";
import { Button } from "primereact/button";
import { OverlayPanel } from "primereact/overlaypanel";
import { InputNumber } from "primereact/inputnumber";
import { ProgressSpinner } from "primereact/progressspinner";

interface Artwork {
  id: number;
  title: string;
  place_of_origin: string;
  artist_display: string;
  inscriptions: string;
  date_start: number;
  date_end: number;
}

const ArtTable: React.FC = () => {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [selectedRows, setSelectedRows] = useState<Artwork[]>([]);
  const [persistedSelection, setPersistedSelection] = useState<
    Record<number, Artwork>
  >({});
  const [selectCount, setSelectCount] = useState<number>(0);
  const [allFetchedArtworks, setAllFetchedArtworks] = useState<Artwork[]>([]);
  const [overlayLoading, setOverlayLoading] = useState<boolean>(false);

  const toast = useRef<Toast>(null);
  const overlayRef = useRef<OverlayPanel>(null);

  // Fetch
  const fetchArtworks = async (pageNumber: number) => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.artic.edu/api/v1/artworks?page=${pageNumber}`
      );
      const data = await res.json();
      setArtworks(data.data);
      setTotalRecords(data.pagination.total);
    } catch (err) {
      console.error("Error fetching artworks:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllArtworks = async (maxNeeded: number) => {
    setOverlayLoading(true);
    const fetched: Artwork[] = [];
    const seenIds = new Set<number>();
    let currentPage = 1;

    try {
      while (fetched.length < maxNeeded) {
        const res = await fetch(
          `https://api.artic.edu/api/v1/artworks?page=${currentPage}`
        );
        const data = await res.json();

        const uniqueNew = data.data.filter(
          (item: Artwork) => !seenIds.has(item.id)
        );

        uniqueNew.forEach((item: Artwork) => seenIds.add(item.id));
        fetched.push(...uniqueNew);

        if (data.pagination.current_page >= data.pagination.total_pages) break;
        currentPage++;
      }

      setAllFetchedArtworks(fetched);
      return fetched;
    } catch (err) {
      console.error("Error fetching all artworks:", err);
      return [];
    } finally {
      setOverlayLoading(false);
    }
  };

  useEffect(() => {
    fetchArtworks(page);
  }, [page]);

  const onPageChange = (event: DataTablePageEvent) => {
    setPage(event.page! + 1);
  };

  const onSelectionChange = (e: { value: Artwork[] }) => {
    const newSelection = e.value;
    const updatedPersisted = { ...persistedSelection };

  
    artworks.forEach((art) => delete updatedPersisted[art.id]);

   
    newSelection.forEach((art) => {
      updatedPersisted[art.id] = art;
    });

    setPersistedSelection(updatedPersisted);
    setSelectedRows(newSelection);
  };

  useEffect(() => {
    // Sync selected rows on page change
    const currentPageSelected = artworks.filter(
      (a) => persistedSelection[a.id]
    );
    setSelectedRows(currentPageSelected);
  }, [artworks]);

  const handleSubmit = () => {
    const total = Object.keys(persistedSelection).length;
    toast.current?.show({
      severity: "info",
      summary: "Selected Artworks",
      detail: `${total} rows selected`,
    });
  };

  const handleSelectCount = async () => {
    if (selectCount <= 0) {
      toast.current?.show({
        severity: "warn",
        summary: "Invalid Number",
        detail: "Please enter a positive number",
      });
      return;
    }

    let allData = allFetchedArtworks;

    if (allData.length < selectCount) {
      allData = await fetchAllArtworks(selectCount);
    }

    const rowsToSelect = allData.slice(0, selectCount);
    const updatedPersisted = { ...persistedSelection };

    rowsToSelect.forEach((art) => {
      updatedPersisted[art.id] = art;
    });

    setPersistedSelection(updatedPersisted);
    setSelectedRows(artworks.filter((a) => updatedPersisted[a.id]));
    overlayRef.current?.hide();

    toast.current?.show({
      severity: "success",
      summary: "Selection Updated",
      detail: `Selected top ${Object.keys(updatedPersisted).length} rows (global)`,
    });
  };


  const titleHeaderTemplate = () => (
    <div className="flex align-items-center gap-2">
      <span>Title</span>
      <Button
        icon="pi pi-sliders-h"
        rounded
        text
        onClick={(e) => overlayRef.current?.toggle(e)}
      />
      <OverlayPanel ref={overlayRef} dismissable showCloseIcon>
        <div className="p-2" style={{ width: "220px" }}>
          <h4 className="mb-3">Select Rows</h4>
          {overlayLoading ? (
            <div className="flex justify-content-center p-3">
              <ProgressSpinner style={{ width: "40px", height: "40px" }} />
            </div>
          ) : (
            <>
              <InputNumber
                value={selectCount}
                onValueChange={(e) => setSelectCount(e.value || 0)}
                placeholder="Enter number"
                min={1}
                className="w-full mb-3"
              />
              <Button
                label="Submit"
                icon="pi pi-check"
                onClick={handleSelectCount}
                disabled={selectCount <= 0}
              />
            </>
          )}
        </div>
      </OverlayPanel>
    </div>
  );

  return (
    <div>
      <Toast ref={toast} />
      <div className="flex justify-content-between align-items-center mb-3">
        <Button
          label="Submit Selected"
          icon="pi pi-check"
          onClick={handleSubmit}
        />
        <span>Total Selected: {Object.keys(persistedSelection).length}</span>
      </div>

      <DataTable
        value={artworks}
        paginator
        rows={10}
        totalRecords={totalRecords}
        lazy
        loading={loading}
        onPage={onPageChange}
        first={(page - 1) * 10}
        dataKey="id"
        selectionMode="checkbox"
        selection={selectedRows}
        onSelectionChange={onSelectionChange}
        tableStyle={{ minWidth: "60rem" }}
      >
        <Column selectionMode="multiple" headerStyle={{ width: "3rem" }} />
        <Column field="title" header={titleHeaderTemplate()} />
        <Column field="place_of_origin" header="Place of Origin" />
        <Column field="artist_display" header="Artist" />
        <Column field="inscriptions" header="Inscriptions" />
        <Column field="date_start" header="Start Date" />
        <Column field="date_end" header="End Date" />
      </DataTable>
    </div>
  );
};

export default ArtTable;
