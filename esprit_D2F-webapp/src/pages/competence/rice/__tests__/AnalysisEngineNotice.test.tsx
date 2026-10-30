import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AnalysisEngineNotice from '../review/AnalysisEngineNotice';

describe('AnalysisEngineNotice', () => {
  it("n'affiche rien si le backend ne renseigne pas la source du référentiel", () => {
    const { container } = render(<AnalysisEngineNotice stats={{}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('annonce une analyse locale avec le modèle réellement chargé', () => {
    render(
      <AnalysisEngineNotice
        stats={{
          referentielSource: 'competence-db',
          moteurIA: {
            llm: false,
            mode: 'semantique-locale+mots-cles',
            modele: 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2@e8f8c211',
          },
        }}
      />,
    );
    expect(screen.getByText(/aucun LLM, aucun service externe/)).toBeInTheDocument();
    expect(
      screen.getByText(/sentence-transformers\/paraphrase-multilingual-MiniLM-L12-v2\)/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/@e8f8c211/)).not.toBeInTheDocument();
  });

  it('avertit quand les codes viennent du référentiel de secours', () => {
    render(
      <AnalysisEngineNotice
        stats={{ referentielSource: 'secours', moteurIA: { llm: false, mode: 'mots-cles' } }}
      />,
    );
    expect(screen.getByText(/codes référentiels indicatifs/)).toBeInTheDocument();
    expect(screen.getByText(/mots-clés uniquement/)).toBeInTheDocument();
  });
});
