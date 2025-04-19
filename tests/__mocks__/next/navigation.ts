export const useRouter = () => {
    return {
      push: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      // Add anything else your code uses
    };
  };
  