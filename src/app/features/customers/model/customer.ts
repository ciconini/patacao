export interface ICustomer {
  id: string;
  image?: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  pets?: IPet[];
}

export interface IPet {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  image: string;
}