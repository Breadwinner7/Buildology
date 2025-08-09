// src/components/security/ComplianceAlert.tsx
export const ComplianceAlert: React.FC<{ userId: string }> = ({ userId }) => {
  const { data: complianceStatus } = useQuery(
    ['compliance-status', userId],
    () => checkProfessionalCompliance(userId),
    { refetchInterval: 24 * 60 * 60 * 1000 } // Daily check
  );

  if (complianceStatus?.overall_status === 'compliant') {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Professional Compliance Issue</AlertTitle>
      <AlertDescription>
        {complianceStatus?.overall_status === 'cpd_non_compliant' && 
          'Your CPD requirements are not up to date.'}
        {complianceStatus?.overall_status === 'no_pi_insurance' && 
          'Your Professional Indemnity insurance has expired.'}
        {complianceStatus?.overall_status === 'no_qualifications' && 
          'No verified professional qualifications found.'}
        <Button variant="link" className="ml-2 p-0 h-auto">
          Update Now
        </Button>
      </AlertDescription>
    </Alert>
  );
};