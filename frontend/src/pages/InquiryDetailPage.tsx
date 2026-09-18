import { Navigate, useParams } from "react-router-dom"

export default function InquiryDetailPage() {
  const { id } = useParams()
  return <Navigate to={`/app/jobs/${id}`} replace />
}
