import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { storageService } from "@/lib/storage.service";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  const download = searchParams.get("download"); // Set to "true" to force attachment download

  if (!key) {
    return new NextResponse("O parâmetro key é obrigatório.", { status: 400 });
  }

  // 1. Identify public assets that don't need auth checks
  const isPublic =
    key.startsWith("system/avatars/") ||
    key.includes("/logos/") ||
    key.includes("/watermarks/") ||
    key.includes("/covers/") ||
    key.startsWith("campaigns/");

  let session = null;
  if (!isPublic) {
    session = await auth();
    if (!session?.user) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }
  }

  try {
    const userId = session?.user?.id;

    // 2. Multi-tenant Authorization checks for private files
    if (!isPublic && userId) {
      // Analyze key path. e.g. "workspace/{workspaceId}/students/{studentId}/progress/..."
      // Or "workspace/{workspaceId}/evaluations/..."
      // Or "workspace/{workspaceId}/files/..."
      const parts = key.split("/");
      const workspaceIndex = parts.indexOf("workspace");
      
      if (workspaceIndex !== -1 && parts[workspaceIndex + 1]) {
        const workspaceId = parts[workspaceIndex + 1];

        // Is user a trainer/owner in this workspace?
        const isTrainer = await prisma.workspaceMember.findFirst({
          where: {
            userId,
            workspaceId,
            role: { in: ["TRAINER", "OWNER"] },
            isActive: true,
          },
        });

        if (!isTrainer) {
          // If the key is a chat attachment, allow active members of the workspace
          const isChatAttachment = key.includes("/chat/");
          if (isChatAttachment) {
            const isWorkspaceMember = await prisma.workspaceMember.findFirst({
              where: {
                userId,
                workspaceId,
                isActive: true,
              },
            });
            if (!isWorkspaceMember) {
              return new NextResponse("Acesso negado para este arquivo do chat.", { status: 403 });
            }
          } else {
            // If not trainer, is the user the student associated with the specific file?
            // Find studentId from path: "students/{studentId}"
            const studentsIndex = parts.indexOf("students");
            let isSelfStudent = false;

            if (studentsIndex !== -1 && parts[studentsIndex + 1]) {
              const studentId = parts[studentsIndex + 1];
              isSelfStudent = userId === studentId;
            } else {
              // Check if key exists in StudentFile database and matches user
              const dbFile = await prisma.studentFile.findFirst({
                where: {
                  objectKey: key,
                  studentId: userId,
                },
              });
              if (dbFile) {
                isSelfStudent = true;
              }
            }

            if (!isSelfStudent) {
              return new NextResponse("Acesso negado para este arquivo.", { status: 403 });
            }
          }
        }
      } else {
        // Fallback checks for keys outside standard workspace directory format
        // Check if file is assigned to student in the database
        const dbFile = await prisma.studentFile.findFirst({
          where: { objectKey: key },
          select: { studentId: true },
        });
        
        if (dbFile && dbFile.studentId !== userId) {
          // Check if trainer of student's workspace
          const studentWorkspaceMember = await prisma.workspaceMember.findFirst({
            where: { userId: dbFile.studentId },
            select: { workspaceId: true },
          });

          if (studentWorkspaceMember) {
            const isTrainer = await prisma.workspaceMember.findFirst({
              where: {
                userId,
                workspaceId: studentWorkspaceMember.workspaceId,
                role: { in: ["TRAINER", "OWNER"] },
                isActive: true,
              },
            });
            if (!isTrainer) {
              return new NextResponse("Acesso negado para este arquivo.", { status: 403 });
            }
          } else {
            return new NextResponse("Acesso negado.", { status: 403 });
          }
        }
      }
    }

    // 3. Stream object from R2
    const fileObject = await storageService.getObjectStream(key);
    
    if (!fileObject.body) {
      return new NextResponse("Arquivo vazio.", { status: 404 });
    }

    // Convert SDK stream to Web stream
    const webStream = (fileObject.body as any).transformToWebStream
      ? (fileObject.body as any).transformToWebStream()
      : fileObject.body;

    const headers = new Headers();
    headers.set("Content-Type", fileObject.contentType || "application/octet-stream");
    
    if (fileObject.contentLength) {
      headers.set("Content-Length", fileObject.contentLength.toString());
    }

    // Cache-Control
    if (isPublic) {
      headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=43200");
    } else {
      headers.set("Cache-Control", "private, max-age=3600");
    }

    // Content-Disposition for download requests
    if (download === "true") {
      const fileName = key.split("/").pop() || "download";
      headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
    }

    return new Response(webStream, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error(" reverse-proxy route error:", error);
    if (error.name === "NoSuchKey") {
      return new NextResponse("Arquivo não encontrado no servidor de armazenamento.", { status: 404 });
    }
    return new NextResponse("Erro ao recuperar o arquivo.", { status: 500 });
  }
}
