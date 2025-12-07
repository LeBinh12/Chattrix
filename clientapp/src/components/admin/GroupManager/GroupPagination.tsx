import { Button, Stack, Box } from "@mui/joy";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  currentPage: number;
  totalPages: number;
  setPage: (page: number) => void;
};

export default function GroupPagination({
  currentPage,
  totalPages,
  setPage,
}: Props) {
  if (totalPages <= 1) return null;

  return (
    <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mt: 3 }}>
      <Button
        variant="outlined"
        size="sm"
        startDecorator={<ChevronLeft size={16} />}
        disabled={currentPage === 1}
        onClick={() => setPage(currentPage - 1)}
      >
        Previous
      </Button>

      <Stack direction="row" spacing={0.5}>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const page = i + 1;

          return (
            <Button
              key={i}
              variant={page === currentPage ? "solid" : "outlined"}
              onClick={() => setPage(page)}
            >
              {page}
            </Button>
          );
        })}
      </Stack>

      <Button
        variant="outlined"
        size="sm"
        endDecorator={<ChevronRight size={16} />}
        disabled={currentPage === totalPages}
        onClick={() => setPage(currentPage + 1)}
      >
        Next
      </Button>
    </Box>
  );
}
