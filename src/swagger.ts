import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",

    info: {
      title: "Visitas API",
      version: "2.0.0",
      description:
        "API para gerenciamento de visitas técnicas às fábricas.",
    },

    servers: [
      {
        url: "http://localhost:3000",
        description: "Servidor local",
      },
    ],
  },

  apis: ["./src/routes/*.ts", "./src/server.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);