// src/components/documents/DocumentUploadItem.tsx
export const DocumentUploadItem: React.FC<DocumentUploadItemProps> = ({
  fileItem, allowedTypes, onTypeChange, onRemove
}) => {
  return (
    <div className="flex items-center space-x-3 p-3 border rounded-lg">
      <div className="flex-shrink-0">
        <FileIcon className="w-8 h-8 text-blue-500" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{fileItem.file.name}</p>
        <p className="text-xs text-gray-500">
          {formatFileSize(fileItem.file.size)}
        </p>
        
        {fileItem.suggestions.length > 0 && (
          <div className="mt-1">
            <p className="text-xs text-blue-600">
              Suggested: {fileItem.suggestions[0].type} 
              ({Math.round(fileItem.suggestions[0].confidence * 100)}% confidence)
            </p>
          </div>
        )}
      </div>
      
      <div className="flex-shrink-0">
        <Select value={fileItem.selectedType} onValueChange={onTypeChange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {allowedTypes?.map(type => (
              <SelectItem key={type.type_code} value={type.type_code}>
                {type.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <Button variant="ghost" size="sm" onClick={onRemove}>
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
};