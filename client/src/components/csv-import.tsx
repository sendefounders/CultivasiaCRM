import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ImportResult {
  success: number;
  errors: Array<{ row: number; message: string; data: any }>;
  duplicates: number;
}

export function CsvImport() {
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('csvFile', file);
      
      const response = await apiRequest('POST', '/api/calls/import', formData);
      return await response.json();
    },
    onSuccess: (result: ImportResult) => {
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ['/api/calls'] });
      
      if (result.success > 0) {
        toast({
          title: "Import successful",
          description: `${result.success} calls imported successfully.`,
        });
      }
      
      if (result.errors.length > 0) {
        toast({
          title: "Import completed with errors",
          description: `${result.errors.length} rows had errors. Check the results below.`,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setImportResult(null);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file.",
        variant: "destructive",
      });
    }
  };

  const handleImport = () => {
    if (file) {
      importMutation.mutate(file);
    }
  };

  const resetImport = () => {
    setFile(null);
    setImportResult(null);
  };

  return (
    <Card data-testid="csv-import-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Import Call List
        </CardTitle>
        <CardDescription>
          Upload a CSV file to import call data. Required columns: DATE, NAME, PHONE, ORDER, PRICE
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="csv-file">Select CSV File</Label>
          <Input
            id="csv-file"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="mt-2"
            data-testid="input-csv-file"
          />
        </div>

        {file && (
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              Ready to import: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleImport}
            disabled={!file || importMutation.isPending}
            data-testid="button-import-csv"
          >
            {importMutation.isPending ? "Importing..." : "Import CSV"}
          </Button>
          
          {(file || importResult) && (
            <Button
              variant="outline"
              onClick={resetImport}
              data-testid="button-reset-import"
            >
              Reset
            </Button>
          )}
        </div>

        {importResult && (
          <div className="space-y-4 mt-6">
            <div className="grid grid-cols-3 gap-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{importResult.success}</strong> successful imports
                </AlertDescription>
              </Alert>
              
              {importResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{importResult.errors.length}</strong> errors
                  </AlertDescription>
                </Alert>
              )}
              
              {importResult.duplicates > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{importResult.duplicates}</strong> duplicates skipped
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {importResult.errors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Import Errors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {importResult.errors.map((error, index) => (
                      <Alert key={index} variant="destructive" data-testid={`import-error-${index}`}>
                        <AlertDescription>
                          <strong>Row {error.row}:</strong> {error.message}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
