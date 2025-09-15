import type { ReactNode } from "react";
import clsx from "clsx";
import Heading from "@theme/Heading";
import styles from "./styles.module.css";

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<"svg">>;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: "Configuração YAML Simples",
    Svg: require("@site/static/img/yaml-tests.png").default,
    description: (
      <>
        Defina testes de API complexos usando arquivos YAML intuitivos. Sem
        necessidade de programação, apenas configuração declarativa que qualquer
        pessoa pode entender e manter.
      </>
    ),
  },
  {
    title: "Testes Inteligentes",
    Svg: require("@site/static/img/inteligent-tests.png").default,
    description: (
      <>
        Capture dados entre requisições, use variáveis dinâmicas com Faker.js,
        execute assertions robustas e organize testes por prioridade. Foque na
        lógica, não na infraestrutura.
      </>
    ),
  },
  {
    title: "Relatórios Visuais",
    Svg: require("@site/static/img/report.png").default,
    description: (
      <>
        Gere relatórios HTML detalhados com métricas de performance, histórico
        de execução e análise de tendências. Visualize resultados de forma clara
        e profissional.
      </>
    ),
  },
];

function Feature({ title, Svg, description }: FeatureItem) {
  return (
    <div className={clsx("col col--4")}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
