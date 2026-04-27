import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BillingDashboard, CompanyBillingDetail } from '../components/billing';

export function BillingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const companyIdFromUrl = searchParams.get('companyId');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(companyIdFromUrl);

  useEffect(() => {
    if (companyIdFromUrl) {
      setSelectedCompanyId(companyIdFromUrl);
    }
  }, [companyIdFromUrl]);

  const handleCompanyClick = (id: string) => {
    setSearchParams({ companyId: id });
    setSelectedCompanyId(id);
  };

  const handleBack = () => {
    setSearchParams({});
    setSelectedCompanyId(null);
  };

  if (selectedCompanyId) {
    return (
      <CompanyBillingDetail
        companyId={selectedCompanyId}
        onBack={handleBack}
      />
    );
  }

  return <BillingDashboard onCompanyClick={handleCompanyClick} />;
}
