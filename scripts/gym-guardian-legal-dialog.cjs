const fs = require('node:fs'); const ts = require('typescript');
const file = 'src/app/(guardian)/guardian/dependents/dependents-client.tsx'; let code = fs.readFileSync(file, 'utf8');
const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX); const targets = [];
function visit(node) { if (ts.isJsxElement(node) && node.openingElement.tagName.getText(source) === 'DialogContent') targets.push(node); ts.forEachChild(node, visit); }
visit(source); if (targets.length !== 1) throw Error('Modal de documento não identificado de forma única.');
const replacement = `<DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{legalDocument?.title || "Documento do AtlasFit"}</DialogTitle>
            <DialogDescription>Representação de {selectedDependentForTerms?.student.name} na {selectedDependentForTerms?.workspace.name}. Este aceite não ativa matrícula, pagamento ou acesso físico.</DialogDescription>
          </DialogHeader>
          {documentError ? <div role="alert" className="space-y-3"><p className="text-sm text-destructive">{documentError}</p><Button variant="outline" onClick={() => setDocumentReload(value => value + 1)}>Tentar novamente</Button></div> : legalDocument ? <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Versão {legalDocument.version}</p>
            <pre className="max-h-[45vh] overflow-auto whitespace-pre-wrap break-words rounded-md border p-4 font-sans text-sm leading-relaxed">{legalDocument.content}</pre>
            <div className="flex items-start gap-3"><Checkbox id="guardian-document-confirmation" checked={acceptedDocument} onCheckedChange={value => setAcceptedDocument(value === true)} disabled={isAcceptingTerms} /><Label htmlFor="guardian-document-confirmation" className="text-sm leading-relaxed">Li e aceito o documento exibido em representação do dependente.</Label></div>
          </div> : <div role="status" className="flex items-center gap-2 py-6 text-sm"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Carregando documento…</div>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDependentForTerms(null)} disabled={isAcceptingTerms}>Fechar</Button>
            <Button onClick={handleAcceptTerms} disabled={isAcceptingTerms || !legalDocument || !acceptedDocument}>{isAcceptingTerms ? "Registrando…" : "Registrar aceite"}</Button>
          </DialogFooter>
        </DialogContent>`;
code = code.slice(0, targets[0].getStart(source)) + replacement + code.slice(targets[0].end);
fs.writeFileSync(file, code);
