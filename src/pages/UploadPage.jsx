import CsvUpload from "../CsvUpload";
import ProtectedUpload from "../components/ProtectedUpload";

export default function UploadPage() {
  return (
    <ProtectedUpload>
      <CsvUpload />
    </ProtectedUpload>
  );
}