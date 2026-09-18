import { useOutletContext } from "react-router-dom"
import { InquiryDocumentsSection } from "@/components/inquiry/InquiryDocumentsSection"
import type { Inquiry } from "@/api/inquiries"

export default function JobFiles() {
  const { inquiry } = useOutletContext<{ inquiry: Inquiry }>()
  return <InquiryDocumentsSection inquiryId={inquiry.id} />
}
