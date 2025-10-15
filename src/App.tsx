import React from 'react';
import { Card } from 'primereact/card';
import ArtTable from './components/ArtTable';

const App: React.FC = () => {
  return (  
    <div className="p-4">
      <Card title="Artworks Table">
        <ArtTable />
      </Card>
    </div>
  );
};

export default App;
