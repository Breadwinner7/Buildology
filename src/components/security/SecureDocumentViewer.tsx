// src/components/security/SecureDocumentViewer.tsx
export const SecureDocumentViewer: React.FC<{
  documentId: string;
  confidentialityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
}> = ({ documentId, confidentialityLevel }) => {
  const { hasPermission } = useUKInsurancePermissions();
  const [accessLogged, setAccessLogged] = useState(false);
  
  const canViewDocument = useMemo(() => {
    switch (confidentialityLevel) {
      case 'public': return true;
      case 'internal': return hasPermission('documents.view_internal');
      case 'confidential': return hasPermission('documents.view_confidential');
      case 'restricted': return hasPermission('documents.view_restricted');
      default: return false;
    }
  }, [confidentialityLevel, hasPermission]);

  useEffect(() => {
    if (canViewDocument && !accessLogged) {
      logDocumentAccess(documentId, 'view');
      setAccessLogged(true);
    }
  }, [canViewDocument, documentId, accessLogged]);

  if (!canViewDocument) {
    return (
      <Card className="p-6 text-center">
        <Shield className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
        <p className="text-muted-foreground">
          You don't have permission to view {confidentialityLevel} documents.
        </p>
      </Card>
    );
  }

  return (
    <div className="relative">
      {confidentialityLevel !== 'public' && (
        <div className="absolute top-2 right-2 z-10">
          <Badge variant="destructive" className="uppercase">
            {confidentialityLevel}
          </Badge>
        </div>
      )}
      
      <DocumentViewer 
        documentId={documentId}
        onDownload={() => logDocumentAccess(documentId, 'download')}
      />
    </div>
  );
};
