import { useRef, useState, useEffect, useCallback } from "react";
import { Box, Button, Spinner, Stack, Text } from "@chakra-ui/react";
import { LuDownload, LuFileText, LuTrash2, LuUpload } from "react-icons/lu";
import {
  listDocuments,
  initUpload,
  confirmUpload,
  getDownloadUrl,
  deleteDocument,
  type InquiryDocument,
} from "@/api/inquiries";

const BORDER = "#D8DCE8";
const ACCENT = "#1563B2";

const DATE_FMT = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function fmtSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function InquiryDocumentsSection({ inquiryId }: { inquiryId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<InquiryDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(() => {
    listDocuments(inquiryId)
      .then(setDocs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [inquiryId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadErr(null);
    try {
      const { documentId, uploadUrl } = await initUpload(inquiryId, {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!uploadRes.ok) throw new Error("Upload to storage failed");
      await confirmUpload(inquiryId, documentId);
      load();
    } catch (err: unknown) {
      setUploadErr(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDownload(doc: InquiryDocument) {
    try {
      const { url, fileName } = await getDownloadUrl(inquiryId, doc.id);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
    } catch {
      alert("Download failed — please try again.");
    }
  }

  async function handleDelete(doc: InquiryDocument) {
    if (!window.confirm(`Delete "${doc.fileName}"? This cannot be undone.`)) return;
    setDeletingId(doc.id);
    try {
      await deleteDocument(inquiryId, doc.id);
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    } catch {
      alert("Delete failed — please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Box bg="white" border="1px solid #D8DCE8" borderRadius="14px" overflow="hidden">
      <Box
        px={5}
        py={3.5}
        borderBottom="1px solid #EFF1F6"
        display="flex"
        alignItems="center"
        justifyContent="space-between"
      >
        <Text
          fontSize="0.6875rem"
          fontWeight="700"
          color="#8A96A8"
          letterSpacing="0.09em"
          textTransform="uppercase"
        >
          Documents & PDFs
        </Text>
        <Box>
          <input
            type="file"
            ref={fileRef}
            style={{ display: "none" }}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.dwg,.step,.stp"
            onChange={handleFileSelect}
          />
          <Button
            size="xs"
            h="28px"
            px={3}
            borderRadius="6px"
            fontWeight="600"
            bg={ACCENT}
            color="white"
            fontSize="0.75rem"
            _hover={{ bg: "#1252A0" }}
            loading={uploading}
            onClick={() => fileRef.current?.click()}
          >
            <LuUpload size={12} /> Upload
          </Button>
        </Box>
      </Box>

      <Box p={5}>
        {uploadErr && (
          <Box mb={3} p={3} border={`1px solid ${BORDER}`} borderRadius="8px" bg="#FEF2F2">
            <Text fontSize="0.8125rem" color="#B91C1C">
              {uploadErr}
            </Text>
          </Box>
        )}

        {loading ? (
          <Box display="flex" alignItems="center" gap={2}>
            <Spinner size="sm" color="gray.500" />
            <Text fontSize="0.875rem" color="#64748B">
              Loading…
            </Text>
          </Box>
        ) : docs.length === 0 ? (
          <Box py={4}>
            <Text fontSize="0.875rem" color="#64748B">
              No documents attached.
            </Text>
            <Text fontSize="0.8125rem" color="#8A96A8" mt={1}>
              Upload offer PDFs, specifications, drawings, or supporting files.
            </Text>
          </Box>
        ) : (
          <Stack gap={0}>
            {docs.map((doc) => (
              <Box
                key={doc.id}
                display="flex"
                alignItems={{ base: "flex-start", sm: "center" }}
                flexDir={{ base: "column", sm: "row" }}
                gap={3}
                py={3}
                borderBottom="1px solid #EFF1F6"
                _last={{ borderBottom: "none" }}
              >
                <Box
                  display="flex"
                  alignItems="center"
                  gap={3}
                  flex="1"
                  minW={0}
                  w={{ base: "full", sm: "auto" }}
                >
                  <Box flexShrink={0} color="#8A96A8">
                    <LuFileText size={18} />
                  </Box>
                  <Box flex="1" minW={0}>
                    <Text
                      fontSize="0.875rem"
                      fontWeight="500"
                      color="#0D1B2E"
                      overflow="hidden"
                      textOverflow="ellipsis"
                      whiteSpace="nowrap"
                    >
                      {doc.fileName}
                    </Text>
                    <Text fontSize="0.75rem" color="#8A96A8" lineHeight="1.5">
                      {fmtSize(doc.fileSize)}
                      {doc.uploadedBy
                        ? ` · ${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}`
                        : ""}
                      {" · "}
                      {DATE_FMT(doc.createdAt)}
                    </Text>
                  </Box>
                </Box>
                <Box
                  display="flex"
                  gap={1}
                  alignSelf={{ base: "flex-end", sm: "center" }}
                  flexShrink={0}
                >
                  <Box
                    as="button"
                    w="30px"
                    h="30px"
                    borderRadius="6px"
                    bg="white"
                    border={`1px solid ${BORDER}`}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    cursor="pointer"
                    color="#64748B"
                    _hover={{ bg: "#F8F9FC", color: "#0D1B2E" }}
                    onClick={() => handleDownload(doc)}
                    title="Download"
                  >
                    <LuDownload size={13} />
                  </Box>
                  <Box
                    as="button"
                    w="30px"
                    h="30px"
                    borderRadius="6px"
                    bg="white"
                    border={`1px solid ${BORDER}`}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    cursor="pointer"
                    color="#64748B"
                    _hover={{ bg: "#FEF2F2", color: "#B91C1C" }}
                    onClick={() => handleDelete(doc)}
                    title="Delete"
                    opacity={deletingId === doc.id ? 0.5 : 1}
                  >
                    <LuTrash2 size={13} />
                  </Box>
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
