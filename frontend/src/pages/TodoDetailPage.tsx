import { Navigate, useParams } from "react-router-dom"

export default function TodoDetailPage() {
  const { id } = useParams<{ id: string }>()
  if (!id) return <Navigate to="/app" replace />
  return <Navigate to={`/app?todo=${id}`} replace />
}
